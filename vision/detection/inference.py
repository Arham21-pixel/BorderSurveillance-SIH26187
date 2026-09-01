from vision.detection.detector import Detector

_detector: Detector | None = None


def run_inference(frame) -> list[dict]:
    global _detector
    if _detector is None:
        _detector = Detector()
    return _detector.predict(frame)
