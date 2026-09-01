from datetime import datetime, timezone

from backend.app.schemas.detection import BoundingBox, Detection, DetectionResult

_HISTORY: list[DetectionResult] = []


def _demo_result(camera_id: str) -> DetectionResult:
    result = DetectionResult(
        camera_id=camera_id,
        timestamp=datetime.now(timezone.utc),
        detections=[
            Detection(
                track_id=1,
                label="person",
                confidence=0.86,
                bbox=BoundingBox(x1=120, y1=80, x2=220, y2=360),
            )
        ],
    )
    _HISTORY.append(result)
    return result


def recent(limit: int = 50) -> list[DetectionResult]:
    if not _HISTORY:
        _demo_result("cam-north-01")
    return list(reversed(_HISTORY[-limit:]))


def for_camera(camera_id: str, limit: int = 50) -> list[DetectionResult]:
    rows = [row for row in _HISTORY if row.camera_id == camera_id]
    if not rows:
        return [_demo_result(camera_id)]
    return list(reversed(rows[-limit:]))


def infer_bytes(camera_id: str, payload: bytes) -> DetectionResult:
    # Lightweight path: full YOLO inference lives in vision.detection.inference
    _ = payload
    return _demo_result(camera_id)
