from pathlib import Path

from evidence.snapshot_generator import save_snapshot


def build_package(camera_id: str, frame, detections: list[dict], event_id: str, output_dir: str = "data/demo") -> dict:
    folder = Path(output_dir) / event_id
    snapshot = save_snapshot(frame, str(folder / "snapshot.jpg")) if frame is not None else None
    return {
        "event_id": event_id,
        "camera_id": camera_id,
        "snapshot": snapshot,
        "detections": detections,
    }
