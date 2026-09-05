"""
vision/detection/inference.py

Convenience wrapper for one-shot frame inference.
The CVPipeline uses the Detector class directly for full control;
this module is kept as a lightweight utility for ad-hoc use.
"""
from __future__ import annotations

from vision.detection.detector import Detector
from vision.detection.result import DetectionResult

# Module-level singleton — created lazily on first call.
# Use CVPipeline for production use; this is for quick experimentation.
_detector: Detector | None = None


def run_inference(
    frame,
    frame_id: int = 0,
    camera_id: str = "default",
    timestamp: str | None = None,
    model_path: str = "yolov8n.pt",
    confidence: float = 0.4,
    imgsz: int = 640,
    device: str = "cpu",
) -> list[DetectionResult]:
    """Run YOLO inference on a single frame, returning DetectionResult objects.

    This function lazily initialises a global Detector with the supplied
    parameters on the first call.  If you need different config per call,
    instantiate ``Detector`` directly instead.
    """
    global _detector
    if _detector is None:
        _detector = Detector(
            model_path=model_path,
            confidence=confidence,
            imgsz=imgsz,
            device=device,
        )
    return _detector.detect(frame, frame_id=frame_id, camera_id=camera_id, timestamp=timestamp)


def reset_inference_singleton() -> None:
    """Force the lazy singleton to be re-created on the next call.

    Useful in tests or when switching model weights.
    """
    global _detector
    _detector = None
