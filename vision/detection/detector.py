from pathlib import Path

from vision.detection.classes import WATCH_CLASSES

_model = None


def _load():
    global _model
    if _model is not None:
        return _model
    try:
        from ultralytics import YOLO
        from backend.app.core.config import settings

        path = Path(settings.detection_model_path)
        if not path.exists():
            _model = YOLO("yolov8n.pt")
        else:
            _model = YOLO(str(path))
        return _model
    except Exception:
        return None


class Detector:
    def __init__(self) -> None:
        self.model = _load()

    def predict(self, frame) -> list[dict]:
        if self.model is None:
            return []
        from backend.app.core.config import settings

        results = self.model.predict(frame, conf=settings.detection_confidence, verbose=False)
        detections: list[dict] = []
        for result in results:
            names = result.names
            for box in result.boxes:
                label = names[int(box.cls[0])]
                if label not in WATCH_CLASSES:
                    continue
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                detections.append(
                    {
                        "label": label,
                        "confidence": float(box.conf[0]),
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    }
                )
        return detections
