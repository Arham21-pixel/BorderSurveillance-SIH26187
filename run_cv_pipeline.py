"""
run_cv_pipeline.py
==================

BORDER AI SENTINEL — Full CV Pipeline Demo
===========================================

Camera/Video → Detection → Tracking → Behaviour Analysis → Normal/Suspicious → Alert/Evidence

Usage
-----
    # Process a video file (CPU, lightweight):
    python run_cv_pipeline.py --source data/sample.mp4 --camera-id cam-01

    # Process webcam:
    python run_cv_pipeline.py --source 0 --camera-id webcam

    # RTSP stream:
    python run_cv_pipeline.py --source rtsp://user:pass@192.168.1.10/live --camera-id cam-north

    # With restricted zone (JSON polygon string):
    python run_cv_pipeline.py --source data/sample.mp4 --zone "[[0,0],[640,0],[640,240],[0,240]]"

    # High-accuracy mode:
    python run_cv_pipeline.py --source data/sample.mp4 --model yolov8s.pt --imgsz 1280

Dependencies (CPU):
    pip install -r vision/requirements-vision.txt
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sys

# Make sure the repo root is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vision.behaviour.analyser import BehaviourAnalyser, BehaviourEvent
from vision.ingestion.video_source import open_source
from vision.pipeline.config import VisionConfig
from vision.pipeline.cv_pipeline import CVPipeline
from vision.utils.logging_config import get_logger
from evidence.generator.evidence_engine import EvidenceEngine

logger = get_logger("run_cv_pipeline")


# ---------------------------------------------------------------------------
# Alert state tracker (avoids duplicate events flooding the terminal)
# ---------------------------------------------------------------------------

class _AlertDeduplicator:
    def __init__(self, cooldown_seconds: float = 10.0) -> None:
        self._last: dict[str, float] = {}
        self.cooldown = cooldown_seconds

    def should_fire(self, key: str, now: float) -> bool:
        last = self._last.get(key, 0.0)
        if now - last >= self.cooldown:
            self._last[key] = now
            return True
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(args: argparse.Namespace) -> None:
    print("\n" + "═" * 65)
    print("  BORDER AI SENTINEL — CV Pipeline")
    print("═" * 65)
    print(f"  Source    : {args.source}")
    print(f"  Camera ID : {args.camera_id}")
    print(f"  Model     : {args.model}")
    print(f"  Device    : {args.device}")
    print(f"  Img Size  : {args.imgsz}")
    print(f"  Sample N  : every {args.sample_every} frame(s)")
    print(f"  Low-light : {args.low_light}")
    print("═" * 65 + "\n")

    # ── Config ────────────────────────────────────────────────────────────────
    config = VisionConfig(
        model_path=args.model,
        confidence=args.confidence,
        imgsz=args.imgsz,
        device=args.device,
        sample_every=args.sample_every,
        preprocess_width=args.resize_width if args.resize_width > 0 else None,
        low_light=args.low_light,
        log_level="INFO",
    )

    # ── Restricted zones ──────────────────────────────────────────────────────
    restricted_zones: dict[str, list] = {}
    if args.zone:
        try:
            polygon = json.loads(args.zone)
            restricted_zones["demo-zone"] = [(float(p[0]), float(p[1])) for p in polygon]
            print(f"[ZONE] Restricted zone 'demo-zone' → {len(polygon)} vertices\n")
        except Exception as e:
            logger.warning("Could not parse --zone argument: %s", e)

    # ── Components ────────────────────────────────────────────────────────────
    pipeline = CVPipeline(config)
    analyser = BehaviourAnalyser(
        loitering_threshold=args.loitering_threshold,
        group_radius=args.group_radius,
        group_min_size=3,
        fast_movement_threshold=args.fast_threshold,
        restricted_zones=restricted_zones,
    )
    evidence_engine = EvidenceEngine(output_dir=args.evidence_dir)
    dedup = _AlertDeduplicator(cooldown_seconds=8.0)

    if not pipeline.is_ready():
        print("[WARN] Detector model not loaded — results will be empty.")
        print("       First run downloads yolov8n.pt via Ultralytics (~6 MB).\n")

    # ── Stats ─────────────────────────────────────────────────────────────────
    frames_processed = 0
    total_detections = 0
    total_events: list[dict] = []
    event_counts: dict[str, int] = {}

    # ── Main loop ─────────────────────────────────────────────────────────────
    print("[RUN] Processing source…\n")

    try:
        source = int(args.source)
    except (ValueError, TypeError):
        source = args.source

    with open_source(source, camera_id=args.camera_id) as src:
        for frame_data in src.frames(
            sample_every=config.sample_every,
            max_frames=args.max_frames or None,
        ):
            frames_processed += 1

            # 1. Detection + Tracking → contract dict
            contract = pipeline.process_frame_data(frame_data)
            n_objects = len(contract.get("objects", []))
            total_detections += n_objects

            if frames_processed % 30 == 0:
                print(
                    f"[FRAME] #{frame_data.frame_index:>6}  "
                    f"objects={n_objects:>2}  "
                    f"tracks={pipeline.track_count(args.camera_id):>2}  "
                    f"ts={contract['timestamp']}"
                )

            # 2. Behaviour Analysis
            behaviour_events = analyser.analyse(
                tracked_objects=contract["objects"],
                camera_id=args.camera_id,
                timestamp=contract["timestamp"],
            )

            # 3. Event / Alert generation
            now_epoch = _parse_epoch(contract["timestamp"])
            for event in behaviour_events:
                event_key = f"{event.track_id}:{event.kind}"
                if not dedup.should_fire(event_key, now_epoch):
                    continue

                severity = _severity(event.confidence)
                event_counts[event.kind] = event_counts.get(event.kind, 0) + 1

                print(
                    f"\n  ⚠  [{severity.upper()}] {event.kind.upper()}\n"
                    f"     Track: {event.track_id}  "
                    f"Class: {event.object_class}  "
                    f"Conf: {event.confidence:.2f}\n"
                    f"     {event.description}\n"
                    f"     Features: {json.dumps(event.features, separators=(',', ':'))}"
                )

                # 4. Evidence package
                event_id = f"evt-{event.kind}-{event.track_id}-{int(now_epoch)}"
                if args.save_evidence:
                    package = evidence_engine.generate(
                        frame=frame_data.frame,
                        event_id=event_id,
                        camera_id=args.camera_id,
                        timestamp=contract["timestamp"],
                        tracked_objects=contract["objects"],
                        event_context={"kind": event.kind, "severity": severity},
                    )
                    print(f"     Evidence → {package.get('metadata', 'n/a')}")

                total_events.append(event.to_dict())

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "═" * 65)
    print("  PIPELINE SUMMARY")
    print("═" * 65)
    print(f"  Frames processed : {frames_processed}")
    print(f"  Total detections : {total_detections}")
    print(f"  Behaviour events : {len(total_events)}")
    for kind, count in sorted(event_counts.items()):
        print(f"    {kind:<20} × {count}")
    print("═" * 65 + "\n")

    if args.output_json and total_events:
        import pathlib
        out = pathlib.Path(args.output_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(total_events, indent=2), encoding="utf-8")
        print(f"Events saved to: {out.resolve()}\n")


def _severity(confidence: float) -> str:
    if confidence >= 0.75:
        return "high"
    if confidence >= 0.45:
        return "medium"
    return "low"


def _parse_epoch(ts: str) -> float:
    try:
        return datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return datetime.datetime.utcnow().timestamp()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="BORDER AI SENTINEL — CV pipeline demo",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--source", default="0", help="Video file path, RTSP URL, or webcam index")
    p.add_argument("--camera-id", default="cam-demo", help="Logical camera identifier")
    p.add_argument("--model", default="yolov8n.pt", help="YOLO model weights path")
    p.add_argument("--confidence", type=float, default=0.40, help="Detection confidence threshold")
    p.add_argument("--imgsz", type=int, default=640, help="YOLO inference image size (multiple of 32)")
    p.add_argument("--device", default="cpu", help="cpu | cuda:0 | mps")
    p.add_argument("--sample-every", type=int, default=2, help="Process every N-th frame")
    p.add_argument("--resize-width", type=int, default=960, help="Preprocess width (0=none)")
    p.add_argument("--low-light", action="store_true", help="Enable CLAHE low-light enhancement")
    p.add_argument("--max-frames", type=int, default=0, help="Stop after N yielded frames (0=unlimited)")
    p.add_argument("--loitering-threshold", type=float, default=30.0, help="Loitering dwell seconds")
    p.add_argument("--group-radius", type=float, default=120.0, help="Group clustering radius (px)")
    p.add_argument("--fast-threshold", type=float, default=80.0, help="Fast movement px/sec threshold")
    p.add_argument("--zone", default="", help="Restricted zone as JSON polygon [[x,y],...] or empty")
    p.add_argument("--save-evidence", action="store_true", help="Save snapshot/metadata on events")
    p.add_argument("--evidence-dir", default="evidence/events", help="Evidence output directory")
    p.add_argument("--output-json", default="", help="Save all events to JSON file")
    return p


if __name__ == "__main__":
    parser = _build_parser()
    args = parser.parse_args()
    run(args)
