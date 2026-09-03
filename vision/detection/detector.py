"""
vision/detection/detector.py

YOLO-based object detector — fully decoupled from backend/Supabase/FastAPI.

All configuration is injected via VisionConfig (vision/pipeline/config.py).
The output is a list of DetectionResult objects — the backend never needs to
import ultralytics or torch directly.
"""
from __future__ import annotations

import datetime
import logging
from pathlib import Path
from typing import TYPE_CHECKING

from vision.detection.classes import WATCH_CLASSES, generic_class
from vision.detection.result import DetectionResult
from vision.utils.logging_config import get_logger

if TYPE_CHECKING:
    # Avoid hard import at module level so the module can be imported
    # even without ultralytics installed (useful for unit tests with mocks).
    import numpy as np

logger = get_logger(__name__)


class Detector:
    """Wraps an Ultralytics YOLO model and returns typed DetectionResult objects.

    Parameters
    ----------
    model_path:
        Path to a ``.pt`` or ``.onnx`` YOLO weights file.
        If the file does not exist, the Ultralytics auto-download for
        ``yolov8n.pt`` is used as a safe fallback.
    confidence:
        Minimum detection confidence in (0, 1].  Default: 0.4.
    imgsz:
        Inference image size (square).  Smaller = faster on CPU.  Default: 640.
    device:
        ``"cpu"`` (default) or ``"cuda:0"`` / ``"mps"``.
    classes_filter:
        Set of class name strings to emit.  Defaults to WATCH_CLASSES.
    """

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence: float = 0.4,
        imgsz: int = 640,
        device: str = "cpu",
        classes_filter: set[str] | None = None,
    ) -> None:
        self.confidence = confidence
        self.imgsz = imgsz
        self.device = device
        self.classes_filter = classes_filter if classes_filter is not None else WATCH_CLASSES
        self._model = None
        self._model_path = model_path
        self._load_model()

    # ── Loading ──────────────────────────────────────────────────────────────

    def _load_model(self) -> None:
        """Load (or download) the YOLO model weights."""
        try:
            from ultralytics import YOLO  # type: ignore[import]

            path = Path(self._model_path)
            if path.exists():
                logger.info("Loading YOLO model from %s", path)
                self._model = YOLO(str(path))
            else:
                logger.warning(
                    "Model file %s not found — using Ultralytics auto-download for yolov8n.pt",
                    path,
                )
                self._model = YOLO("yolov8n.pt")

            # Warm-up: set device preference (ultralytics handles this lazily)
            logger.info("YOLO model loaded. Device: %s  ImgSz: %d", self.device, self.imgsz)

        except ImportError:
            logger.error("ultralytics is not installed — detection disabled.")
            self._model = None
        except Exception as exc:
            logger.error("Failed to load YOLO model: %s", exc)
            self._model = None

    # ── Inference ────────────────────────────────────────────────────────────

    def detect(
        self,
        frame: "np.ndarray",
        frame_id: int = 0,
        camera_id: str = "default",
        timestamp: str | None = None,
    ) -> list[DetectionResult]:
        """Run inference on one BGR frame.

        Parameters
        ----------
        frame:
            BGR numpy array from OpenCV.
        frame_id:
            Sequential frame index.
        camera_id:
            Source camera identifier.
        timestamp:
            ISO-8601 string; auto-generated if None.

        Returns
        -------
        list[DetectionResult]
            One DetectionResult per qualifying detection, sorted by confidence.
        """
        if self._model is None:
            logger.debug("Detector not loaded — returning empty results.")
            return []

        if frame is None or frame.size == 0:
            logger.warning("Received empty frame (frame_id=%d, camera_id=%s)", frame_id, camera_id)
            return []

        if timestamp is None:
            timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        try:
            results = self._model.predict(
                frame,
                conf=self.confidence,
                imgsz=self.imgsz,
                device=self.device,
                verbose=False,
            )
        except Exception as exc:
            logger.error(
                "YOLO inference error (frame_id=%d, camera_id=%s): %s",
                frame_id,
                camera_id,
                exc,
            )
            return []

        detections: list[DetectionResult] = []
        for result in results:
            names = result.names  # {int: str}
            for box in result.boxes:
                raw_cls = int(box.cls[0])
                class_name = names.get(raw_cls, "unknown")

                if class_name not in self.classes_filter:
                    continue

                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                conf = float(box.conf[0])

                detections.append(
                    DetectionResult(
                        frame_id=frame_id,
                        timestamp=timestamp,
                        class_id=raw_cls,
                        class_name=class_name,
                        confidence=conf,
                        bounding_box=[x1, y1, x2, y2],
                        camera_id=camera_id,
                    )
                )

        # Sort by confidence descending for consistent ordering
        detections.sort(key=lambda d: d.confidence, reverse=True)
        logger.debug(
            "frame_id=%d camera=%s → %d detections", frame_id, camera_id, len(detections)
        )
        return detections

    def is_ready(self) -> bool:
        """Return True if the model is loaded and ready for inference."""
        return self._model is not None

    def reload(self, model_path: str | None = None) -> None:
        """Reload model weights (useful for hot-swapping models)."""
        if model_path:
            self._model_path = model_path
        self._load_model()
