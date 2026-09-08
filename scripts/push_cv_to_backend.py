"""
scripts/push_cv_to_backend.py
=============================

Bridge: CV pipeline → Backend Ingest API
=========================================

Runs the full vision pipeline on a webcam or video file and pushes every
tracked detection to the backend ``POST /api/ingest/detection`` endpoint in
real time.

Usage
-----
    # Webcam → backend (auto-creates a camera named 'cam-demo' if needed)
    python scripts/push_cv_to_backend.py --source 0 --camera-id cam-demo

    # Video file → backend (use a fixed cam UUID from /api/cameras)
    python scripts/push_cv_to_backend.py \\
        --source data/sample.mp4 \\
        --camera-id 11111111-1111-1111-1111-111111111111

    # Dry-run (no backend calls, just print the contract dicts)
    python scripts/push_cv_to_backend.py --source data/sample.mp4 --dry-run

Env
---
    BACKEND_URL  (default: http://localhost:8000)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from typing import Any
from uuid import UUID

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import requests
except ImportError:
    requests = None  # type: ignore[assignment]

from vision.behaviour.analyser import BehaviourAnalyser
from vision.ingestion.video_source import open_source
from vision.pipeline.config import VisionConfig
from vision.pipeline.cv_pipeline import CVPipeline
from vision.utils.logging_config import get_logger

logger = get_logger("push_cv_to_backend", level=logging.INFO)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")


def _is_valid_uuid(val: str) -> bool:
    try:
        UUID(val)
        return True
    except ValueError:
        return False


def _get_or_create_camera(camera_id_hint: str) -> str:
    """Return a valid UUID camera_id for the backend.

    If ``camera_id_hint`` is already a UUID, return it unchanged (trusting the
    caller to have pre-created it).  Otherwise look for a camera whose
    ``camera_code`` or ``name`` matches and return its ID; if not found, create
    one automatically.
    """
    if requests is None:
        raise RuntimeError("pip install requests  to use push_cv_to_backend")

    if _is_valid_uuid(camera_id_hint):
        return camera_id_hint

    # Try to find existing camera with matching code / name
    try:
        r = requests.get(f"{BACKEND_URL}/api/cameras", timeout=5)
        r.raise_for_status()
        for cam in r.json():
            if cam.get("camera_code") == camera_id_hint or cam.get("name") == camera_id_hint:
                logger.info("Found existing camera: %s → %s", camera_id_hint, cam["id"])
                return cam["id"]
    except Exception as exc:
        logger.warning("Could not fetch cameras: %s", exc)

    # Create a new camera
    payload = {
        "name": camera_id_hint,
        "camera_code": camera_id_hint[:20],
        "location": "Auto-created by push_cv_to_backend",
        "stream_ref": "auto",
        "status": "ACTIVE",
    }
    try:
        r = requests.post(f"{BACKEND_URL}/api/cameras", json=payload, timeout=5)
        r.raise_for_status()
        cam_id = r.json()["id"]
        logger.info("Created new camera '%s' → %s", camera_id_hint, cam_id)
        return cam_id
    except Exception as exc:
        raise RuntimeError(f"Cannot create camera on backend: {exc}") from exc


def _contract_to_detections(
    contract: dict,
    camera_uuid: str,
    *,
    attributes: dict[str, Any] | None = None,
) -> list[dict]:
    """Convert a CV pipeline contract dict → list of DetectionInput dicts."""
    timestamp = contract.get("timestamp", "")
    frame_id = str(contract.get("frame_id", ""))
    detections = []
    for obj in contract.get("objects", []):
        bb = obj.get("bounding_box", [0, 0, 0, 0])
        trajectory = [
            {"x": float(pt[0]), "y": float(pt[1])}
            for pt in obj.get("trajectory", [])
        ]
        detections.append({
            "camera_id": camera_uuid,
            "timestamp": timestamp,
            "frame_id": frame_id,
            "track_id": str(obj.get("track_id", "track-0")),
            "object_class": str(obj.get("object_class", "person")),
            "confidence": float(obj.get("confidence", 0.5)),
            "bounding_box": {
                "x1": float(bb[0]),
                "y1": float(bb[1]),
                "x2": float(bb[2]),
                "y2": float(bb[3]),
            },
            "trajectory": trajectory,
            "attributes": attributes or {},
        })
    return detections


def _push_detection(detection: dict, *, dry_run: bool = False) -> dict | None:
    """POST a single detection to the backend ingest API."""
    if dry_run:
        print(f"  [DRY-RUN] Would POST /api/ingest/detection → {json.dumps(detection, default=str)[:140]}")
        return None
    if requests is None:
        raise RuntimeError("pip install requests")
    try:
        r = requests.post(
            f"{BACKEND_URL}/api/ingest/detection",
            json=detection,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.warning("Ingest push failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(args: argparse.Namespace) -> None:
    print("\n" + "=" * 65)
    print("  BORDER AI SENTINEL — CV → Backend Bridge")
    print("=" * 65)
    print(f"  Backend   : {BACKEND_URL}")
    print(f"  Source    : {args.source}")
    print(f"  Camera    : {args.camera_id}")
    print(f"  Dry-run   : {args.dry_run}")
    print("=" * 65 + "\n")

    if not args.dry_run:
        if requests is None:
            print("[ERROR] 'requests' not installed. Run:  pip install requests")
            sys.exit(1)
        # Verify backend is reachable
        try:
            r = requests.get(f"{BACKEND_URL}/health", timeout=5)
            r.raise_for_status()
            print(f"[OK] Backend health: {r.json()}\n")
        except Exception as exc:
            print(f"[ERROR] Cannot reach backend at {BACKEND_URL}: {exc}")
            print("       Start the backend first with:")
            print("       python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000")
            sys.exit(1)

        camera_uuid = _get_or_create_camera(args.camera_id)
        print(f"[CAM] Using camera UUID: {camera_uuid}\n")
    else:
        camera_uuid = args.camera_id if _is_valid_uuid(args.camera_id) else "00000000-0000-0000-0000-000000000001"

    config = VisionConfig(
        model_path=args.model,
        confidence=args.confidence,
        imgsz=640,
        device="cpu",
        sample_every=args.sample_every,
        log_level="WARNING",
    )
    pipeline = CVPipeline(config)
    analyser = BehaviourAnalyser(loitering_threshold=30.0)

    if not pipeline.is_ready():
        print("[WARN] YOLO model not loaded — only tracker output will be generated.\n")

    # Determine source type
    try:
        source: int | str = int(args.source)
    except (ValueError, TypeError):
        source = args.source

    frames_processed = 0
    objects_sent = 0
    alerts_fired = 0
    start_time = time.time()

    print("[RUN] Processing frames…\n")

    with open_source(source, camera_id=args.camera_id) as src:
        for frame_data in src.frames(
            sample_every=config.sample_every,
            max_frames=args.max_frames or None,
        ):
            frames_processed += 1
            contract = pipeline.process_frame_data(frame_data)

            # Behaviour analysis for attributes
            behaviour_events = analyser.analyse(
                tracked_objects=contract.get("objects", []),
                camera_id=args.camera_id,
                timestamp=contract["timestamp"],
            )
            behaviour_map: dict[str, dict] = {}
            for evt in behaviour_events:
                behaviour_map[str(evt.track_id)] = {
                    "loitering": evt.kind == "loitering",
                    "group_size": evt.features.get("group_size", 1),
                    "toward_boundary": evt.kind == "fast_movement",
                }

            detections = _contract_to_detections(contract, camera_uuid)
            for det in detections:
                attrs = behaviour_map.get(det["track_id"], {})
                det["attributes"] = attrs
                result = _push_detection(det, dry_run=args.dry_run)
                objects_sent += 1
                if result and result.get("alert_created"):
                    alerts_fired += 1
                    print(
                        f"  ⚠  ALERT  [{result['severity']}]  "
                        f"track={det['track_id']}  "
                        f"score={result['risk_score']:.1f}  "
                        f"event={result['event_type']}"
                    )

            if frames_processed % 30 == 0:
                elapsed = time.time() - start_time
                fps = frames_processed / elapsed if elapsed > 0 else 0
                n_obj = len(contract.get("objects", []))
                print(
                    f"[{frames_processed:>5}]  objects={n_obj:>2}  "
                    f"sent={objects_sent}  alerts={alerts_fired}  "
                    f"fps={fps:.1f}"
                )

    elapsed = time.time() - start_time
    print("\n" + "=" * 65)
    print("  DONE")
    print(f"  Frames processed : {frames_processed}")
    print(f"  Objects sent     : {objects_sent}")
    print(f"  Alerts fired     : {alerts_fired}")
    print(f"  Elapsed          : {elapsed:.1f}s")
    print("=" * 65 + "\n")


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="CV pipeline → backend ingest bridge",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--source", default="0", help="Webcam index, video file path, or RTSP URL")
    p.add_argument("--camera-id", default="cam-demo",
                   help="Camera UUID (from /api/cameras) or a name to auto-create")
    p.add_argument("--model", default="yolov8n.pt", help="YOLO model weights")
    p.add_argument("--confidence", type=float, default=0.40)
    p.add_argument("--sample-every", type=int, default=3,
                   help="Process every N-th frame (higher = faster, fewer detections)")
    p.add_argument("--max-frames", type=int, default=0, help="Stop after N frames (0=unlimited)")
    p.add_argument("--dry-run", action="store_true", help="Print payloads without POSTing")
    return p


if __name__ == "__main__":
    parser = _build_parser()
    args = parser.parse_args()
    run(args)
