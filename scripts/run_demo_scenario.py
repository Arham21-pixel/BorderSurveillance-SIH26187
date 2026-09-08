"""
scripts/run_demo_scenario.py
============================

BORDER AI SENTINEL — Hackathon Judge Demo
==========================================

One-command demo that injects synthetic detections into the backend and walks
judges through all 5 PRD threat scenarios in ~60 seconds.

Usage
-----
    # Full demo (synthetic detections — no camera required)
    python scripts/run_demo_scenario.py

    # Use webcam as live input for S1 (restricted zone) detection
    python scripts/run_demo_scenario.py --webcam

    # Point at a specific backend
    python scripts/run_demo_scenario.py --backend http://localhost:8000

What the script does
--------------------
    S1  Restricted zone entry   → CRITICAL/HIGH alert
    S2  Animal / benign object  → NORMAL, no alert (animal deduction)
    S3  Loitering person        → SUSPICIOUS alert
    S4  Group + toward boundary → HIGH alert
    S5  Camera offline signal   → camera status set to OFFLINE, then ACTIVE

Each step prints a numbered, human-readable status line so a judge can
follow along in real time.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' not installed.  Run:  pip install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

    # Fixed demo camera IDs (seeded in InMemoryRepository)
CAM_NORTH = "11111111-1111-1111-1111-111111111111"
CAM_GATE  = "22222222-2222-2222-2222-222222222222"
CAM_FENCE = "33333333-3333-3333-3333-333333333333"

# Per-run session prefix so that multiple demo runs on the same server don't
# interfere with each other's track state (loitering timers, trajectory).
_SESSION = uuid.uuid4().hex[:8]

# Colours for terminal output (ANSI)
_R = "\033[91m"   # red
_Y = "\033[93m"   # yellow
_G = "\033[92m"   # green
_C = "\033[96m"   # cyan
_B = "\033[94m"   # blue
_W = "\033[97m"   # white bold
_X = "\033[0m"    # reset


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _banner(text: str) -> None:
    print(f"\n{_W}{'=' * 68}{_X}")
    print(f"{_W}  {text}{_X}")
    print(f"{_W}{'=' * 68}{_X}\n")


def _step(n: int, title: str, description: str) -> None:
    print(f"\n{_C}+-- SCENARIO S{n}: {title} {_X}")
    print(f"{_C}|   {description}{_X}")
    print(f"{_C}+{'─' * 60}{_X}\n")


def _ok(msg: str) -> None:
    print(f"  {_G}[OK]  {msg}{_X}")


def _warn(msg: str) -> None:
    print(f"  {_Y}[!!]  {msg}{_X}")


def _err(msg: str) -> None:
    print(f"  {_R}[XX]  {msg}{_X}")


def _info(msg: str) -> None:
    print(f"  {_B}[..]  {msg}{_X}")


def _health_check() -> bool:
    try:
        r = requests.get(f"{BACKEND_URL}/health", timeout=5)
        r.raise_for_status()
        return r.json().get("status") == "ok"
    except Exception as exc:
        _err(f"Backend not reachable: {exc}")
        return False


def _get_cameras() -> list[dict]:
    r = requests.get(f"{BACKEND_URL}/api/cameras", timeout=5)
    r.raise_for_status()
    return r.json()


def _ensure_cameras() -> dict[str, str]:
    """Make sure demo cameras exist.  Return mapping name→id.

    Tries to create cameras if they don't exist.  Falls back to any
    existing camera if creation fails (e.g., Supabase FK constraints).
    """
    cameras = _get_cameras()
    existing_by_id = {cam["id"]: cam for cam in cameras}
    mapping: dict[str, str] = {}

    required = [
        {"id": CAM_NORTH, "name": "CAM-NORTH", "camera_code": "NF-01",
         "location": "North Sector Fence", "stream_ref": "0", "status": "ACTIVE",
         "latitude": 34.1526, "longitude": 77.5771},
        {"id": CAM_GATE,  "name": "CAM-GATE",  "camera_code": "GW-02",
         "location": "Main Gate Entry",      "stream_ref": "rtsp://gate/live", "status": "ACTIVE",
         "latitude": 34.1401, "longitude": 77.5102},
        {"id": CAM_FENCE, "name": "CAM-FENCE", "camera_code": "FE-03",
         "location": "South Perimeter Fence", "stream_ref": "rtsp://fence/live","status": "ACTIVE",
         "latitude": 34.1350, "longitude": 77.5400},
    ]

    for cam in required:
        if cam["id"] in existing_by_id:
            mapping[cam["name"]] = cam["id"]
            _ok(f"Camera {cam['name']} exists  ({cam['id']})")
        else:
            # Try to create it
            payload = {k: v for k, v in cam.items() if k != "id"}
            try:
                r = requests.post(f"{BACKEND_URL}/api/cameras", json=payload, timeout=5)
                r.raise_for_status()
                created_id = r.json()["id"]
                mapping[cam["name"]] = created_id
                _ok(f"Created camera {cam['name']} -> {created_id}")
            except Exception as exc:
                _warn(f"Could not create {cam['name']}: {exc}")
                # Fall back to the first available camera
                if cameras:
                    fallback_id = cameras[0]["id"]
                    mapping[cam["name"]] = fallback_id
                    _info(f"Using fallback camera {fallback_id} for {cam['name']}")
                else:
                    mapping[cam["name"]] = cam["id"]

    return mapping


def _ingest(detection: dict[str, Any]) -> dict | None:
    """POST a detection to the backend and return the result."""
    try:
        r = requests.post(
            f"{BACKEND_URL}/api/ingest/detection",
            json=detection,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        _err(f"Ingest failed: {exc}")
        return None


def _make_detection(
    camera_id: str,
    track_id: str,
    object_class: str = "person",
    confidence: float = 0.88,
    bbox: tuple = (200, 220, 280, 420),
    trajectory: list | None = None,
    attributes: dict | None = None,
) -> dict[str, Any]:
    x1, y1, x2, y2 = bbox
    if trajectory is None:
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        trajectory = [
            {"x": cx - 20, "y": cy - 30},
            {"x": cx - 10, "y": cy - 15},
            {"x": cx,      "y": cy},
        ]
    return {
        "camera_id": camera_id,
        "timestamp": _now_iso(),
        "frame_id": f"demo-{uuid.uuid4().hex[:8]}",
        "track_id": track_id,
        "object_class": object_class,
        "confidence": confidence,
        "bounding_box": {"x1": float(x1), "y1": float(y1), "x2": float(x2), "y2": float(y2)},
        "trajectory": trajectory,
        "attributes": attributes or {},
    }


def _show_result(result: dict | None, expected_alert: bool = True) -> None:
    if result is None:
        _err("No result returned from backend.")
        return
    severity = result.get("severity", "?")
    score = result.get("risk_score", 0)
    event = result.get("event_type", "?")
    alert = result.get("alert_created", False)

    colour = {
        "CRITICAL": _R,
        "HIGH":     _R,
        "SUSPICIOUS": _Y,
        "NORMAL":   _G,
    }.get(severity, _X)

    print(f"  {colour}Severity : {severity:12s}   Score : {score:.1f}/100{_X}")
    print(f"  {_B}Event    : {event}{_X}")
    for reason in result.get("reasons", []):
        print(f"  {_W}  → {reason}{_X}")
    if alert:
        if expected_alert:
            _ok(f"Alert CREATED → id={result.get('event_id', '?')}")
        else:
            _warn("Alert was created (expected: none).")
    else:
        if not expected_alert:
            _ok("No alert — correct (benign detection)")
        else:
            _warn("No alert was created (score may be below threshold).")


def _update_camera_status(camera_id: str, status: str) -> bool:
    try:
        r = requests.patch(
            f"{BACKEND_URL}/api/cameras/{camera_id}",
            json={"status": status},
            timeout=5,
        )
        r.raise_for_status()
        return True
    except Exception as exc:
        _warn(f"Could not update camera status: {exc}")
        return False


# ---------------------------------------------------------------------------
# Scenario implementations
# ---------------------------------------------------------------------------

def scenario_s1_restricted_zone(cam_id: str, pause: float) -> None:
    """S1: Person enters a restricted zone → CRITICAL/HIGH alert."""
    _step(1, "Restricted Zone Entry",
          "A person crosses into the RESTRICTED zone near the fence.\n"
          "  Expected: CRITICAL or HIGH alert with reason 'Restricted zone entry'.")

    # Push with attributes that force zone detection
    # The bounding box is inside the z-north-restricted zone polygon (80,200)-(900,520)
    detection = _make_detection(
        camera_id=cam_id,
        track_id=f"{_SESSION}-s1-restricted",
        object_class="person",
        confidence=0.91,
        bbox=(200, 250, 260, 430),  # inside restricted zone [80,200]→[900,520]
        attributes={"night": True},
    )

    _info(f"Pushing detection: track={detection['track_id']}  class=person  night=True")
    result = _ingest(detection)
    _show_result(result, expected_alert=True)
    time.sleep(pause)


def scenario_s2_animal(cam_id: str, pause: float) -> None:
    """S2: Animal detected → low risk, no alert."""
    _step(2, "Animal / Benign Object",
          "A dog is detected near the fence.\n"
          "  Expected: NORMAL severity, NO alert (animal negative contributor -40).")

    detection = _make_detection(
        camera_id=cam_id,
        track_id=f"{_SESSION}-s2-animal",
        object_class="dog",
        confidence=0.78,
        bbox=(400, 300, 460, 420),
        attributes={"is_animal": True},
    )

    _info(f"Pushing detection: track={detection['track_id']}  class=dog  is_animal=True")
    result = _ingest(detection)
    _show_result(result, expected_alert=False)
    time.sleep(pause)


def scenario_s3_loitering(cam_id: str, pause: float) -> None:
    """S3: Person loiters → SUSPICIOUS alert."""
    from datetime import timedelta

    _step(3, "Loitering Person",
          "A person dwells in the buffer zone for > 30 seconds.\n"
          "  Expected: SUSPICIOUS alert with reason 'Loitering threshold exceeded'.")

    # Strategy: send the FIRST detection with a timestamp 40 seconds in the
    # past.  The IntelligencePipeline (singleton) records first_seen_at = that
    # past time.  The SECOND detection, sent with the current time, produces a
    # dwell of ~40 s — above the 30 s loitering threshold.

    track_id = f"{_SESSION}-s3-loiter"  # fresh track per session to avoid dedupe
    now = datetime.now(timezone.utc)
    past = now - timedelta(seconds=40)

    _info(f"Pushing first frame at t-40s to seed dwell timer…")
    det_past = _make_detection(
        camera_id=cam_id,
        track_id=track_id,
        object_class="person",
        confidence=0.84,
        bbox=(300, 150, 360, 320),
    )
    det_past["timestamp"] = past.isoformat()
    _ingest(det_past)

    _info(f"Pushing current frame — dwell now > 30 s, loitering fires!")
    det_now = _make_detection(
        camera_id=cam_id,
        track_id=track_id,
        object_class="person",
        confidence=0.84,
        bbox=(302, 152, 362, 322),
    )
    result = _ingest(det_now)

    _show_result(result, expected_alert=True)
    time.sleep(pause)


def scenario_s4_group_boundary(cam_id: str, pause: float) -> None:
    """S4: Group of people moving toward boundary → HIGH alert."""
    _step(4, "Group + Toward Boundary",
          "3 people converge and move toward the protected boundary.\n"
          "  Expected: HIGH alert with 'Group' and 'toward boundary' reasons.")

    base_x = 200
    track_ids = [f"{_SESSION}-s4-grp-a", f"{_SESSION}-s4-grp-b", f"{_SESSION}-s4-grp-c"]
    results = []

    _info("Pushing 3 grouped tracks simultaneously…")
    for i, tid in enumerate(track_ids):
        ox = base_x + i * 80
        detection = _make_detection(
            camera_id=cam_id,
            track_id=tid,
            object_class="person",
            confidence=0.86,
            bbox=(ox, 180, ox + 55, 360),
            attributes={
                "toward_boundary": True,
                "group_size": 3,
            },
        )
        result = _ingest(detection)
        results.append(result)
        time.sleep(0.1)

    # Show the highest-risk result
    best = max(results, key=lambda r: r.get("risk_score", 0) if r else 0, default=None)
    _show_result(best, expected_alert=True)
    time.sleep(pause)


def scenario_s5_camera_offline(cam_id: str, pause: float) -> None:
    """S5: Camera goes offline then reconnects."""
    _step(5, "Camera Offline / Reconnect",
          "CAM-FENCE is marked OFFLINE (simulating stream loss).\n"
          "  Then it reconnects and returns to ACTIVE.\n"
          "  Expected: status change visible in /api/cameras.")

    _info(f"Setting camera {cam_id} → INACTIVE (stream loss)…")
    ok = _update_camera_status(cam_id, "INACTIVE")
    if ok:
        _ok("Camera marked INACTIVE (offline)")

    time.sleep(2)

    _info("Simulating reconnect → ACTIVE…")
    ok = _update_camera_status(cam_id, "ACTIVE")
    if ok:
        _ok("Camera back ACTIVE (online)")

    # Verify via GET
    try:
        r = requests.get(f"{BACKEND_URL}/api/cameras", timeout=5)
        r.raise_for_status()
        for cam in r.json():
            if cam["id"] == cam_id:
                _ok(f"Confirmed camera status = {cam.get('status', '?')}")
    except Exception:
        pass

    time.sleep(pause)


# ---------------------------------------------------------------------------
# Webcam live-feed scenario (optional)
# ---------------------------------------------------------------------------

def scenario_webcam(cam_id: str) -> None:
    """Live webcam → backend bridge for 30 seconds."""
    _step(0, "Live Webcam → Backend (30 s)",
          "Reading from webcam and pushing every detection to the backend.")

    try:
        from vision.behaviour.analyser import BehaviourAnalyser
        from vision.ingestion.video_source import open_source
        from vision.pipeline.config import VisionConfig
        from vision.pipeline.cv_pipeline import CVPipeline
    except ImportError as exc:
        _warn(f"Vision stack not available: {exc}.  Skipping webcam scenario.")
        return

    config = VisionConfig(model_path="yolov8n.pt", confidence=0.40, imgsz=640,
                          device="cpu", sample_every=3, log_level="WARNING")
    pipeline = CVPipeline(config)
    analyser = BehaviourAnalyser(loitering_threshold=30.0)

    _info("Opening webcam (index 0)…  Press Ctrl+C to stop early.")

    deadline = time.time() + 30
    frames = 0
    sent = 0
    alerts = 0

    with open_source(0, camera_id="webcam-live") as src:
        for frame_data in src.frames(sample_every=3):
            if time.time() > deadline:
                break
            frames += 1
            contract = pipeline.process_frame_data(frame_data)
            for obj in contract.get("objects", []):
                bb = obj["bounding_box"]
                det = _make_detection(
                    camera_id=cam_id,
                    track_id=str(obj["track_id"]),
                    object_class=str(obj.get("object_class", "person")),
                    confidence=float(obj.get("confidence", 0.5)),
                    bbox=(bb[0], bb[1], bb[2], bb[3]),
                    trajectory=[{"x": float(p[0]), "y": float(p[1])}
                                for p in obj.get("trajectory", [])],
                )
                result = _ingest(det)
                sent += 1
                if result and result.get("alert_created"):
                    alerts += 1
                    severity = result.get("severity", "?")
                    score = result.get("risk_score", 0)
                    print(f"  [!!] ALERT [{severity}] score={score:.1f}  track={det['track_id']}")

    _ok(f"Webcam complete: {frames} frames, {sent} objects sent, {alerts} alerts")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def _print_final_summary() -> None:
    _banner("DEMO COMPLETE — Final Backend State")

    try:
        alerts_r = requests.get(f"{BACKEND_URL}/api/alerts", timeout=5)
        alerts_r.raise_for_status()
        data = alerts_r.json()
        items = data.get("items", [])
        total = data.get("total", len(items))
        _ok(f"Total alerts in backend : {total}")

        by_sev: dict[str, int] = {}
        for a in items:
            sev = a.get("severity", "?")
            by_sev[sev] = by_sev.get(sev, 0) + 1
        for sev, count in sorted(by_sev.items()):
            colour = {
                "CRITICAL": _R, "HIGH": _R, "SUSPICIOUS": _Y, "NORMAL": _G,
            }.get(sev, _X)
            print(f"    {colour}{sev:12s} : {count}{_X}")
    except Exception as exc:
        _warn(f"Could not fetch alerts: {exc}")

    try:
        summary_r = requests.get(f"{BACKEND_URL}/api/analytics/summary", timeout=5)
        summary_r.raise_for_status()
        s = summary_r.json()
        _info(f"avg_risk_score = {s.get('avg_risk_score', '?')}")
        _info(f"total_alerts   = {s.get('total_alerts', '?')}")
    except Exception:
        pass

    print(f"\n{_W}Frontend dashboard: http://localhost:5173{_X}")
    print(f"{_W}Backend API docs  : {BACKEND_URL}/docs{_X}\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main(args: argparse.Namespace) -> None:
    _banner("BORDER AI SENTINEL — Judge Demo")
    print(f"  Backend : {BACKEND_URL}")
    print(f"  Time    : {_now_iso()}\n")

    # 1. Health check
    _info("Checking backend health…")
    if not _health_check():
        print("\n[ERROR] Backend is not running. Start it with:")
        print("  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000\n")
        sys.exit(1)
    _ok("Backend is healthy")

    # 2. Ensure demo cameras exist
    _info("Verifying demo cameras…")
    cam_map = _ensure_cameras()

    cam_north = cam_map.get("CAM-NORTH", CAM_NORTH)
    cam_gate  = cam_map.get("CAM-GATE",  CAM_GATE)
    cam_fence = cam_map.get("CAM-FENCE", CAM_FENCE)

    # 3. Optional: webcam live feed
    if args.webcam:
        scenario_webcam(cam_north)

    pause = args.pause

    # 4. Run all 5 scenarios
    scenario_s1_restricted_zone(cam_north, pause)
    scenario_s2_animal(cam_north, pause)
    scenario_s3_loitering(cam_gate, pause)
    scenario_s4_group_boundary(cam_fence, pause)
    scenario_s5_camera_offline(cam_fence, pause)

    # 5. Final summary
    _print_final_summary()


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Border AI Sentinel — hackathon judge demo",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--backend", default=BACKEND_URL, dest="backend",
                   help="Backend base URL")
    p.add_argument("--pause", type=float, default=2.0,
                   help="Pause (seconds) between scenarios")
    p.add_argument("--webcam", action="store_true",
                   help="Open webcam for 30 s before synthetic scenarios")
    return p


if __name__ == "__main__":
    parser = _build_parser()
    args = parser.parse_args()
    # Allow overriding backend URL from --backend arg
    BACKEND_URL = args.backend
    main(args)
