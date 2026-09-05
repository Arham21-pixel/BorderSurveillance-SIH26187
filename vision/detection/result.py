"""
vision/detection/result.py

Typed output object for YOLO detections.
The backend/intelligence layer consumes DetectionResult objects —
it never needs to import Ultralytics or torch directly.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class DetectionResult:
    """A single object detected by YOLO in one frame.

    Attributes
    ----------
    frame_id:
        Sequential frame index within the current video source.
    timestamp:
        ISO-8601 UTC timestamp of the frame.
    class_id:
        COCO (or model-specific) numeric class index.
    class_name:
        Human-readable class label, e.g. ``"person"``, ``"car"``.
    confidence:
        Detection confidence in [0, 1].
    bounding_box:
        ``[x1, y1, x2, y2]`` pixel coordinates in the *original* (pre-resize) frame.
    camera_id:
        Identifier for the camera/source that produced this frame.
    """

    frame_id: int
    timestamp: str
    class_id: int
    class_name: str
    confidence: float
    bounding_box: list[float]  # [x1, y1, x2, y2]
    camera_id: str

    def to_dict(self) -> dict:
        """Serialise to a plain dict for JSON transport."""
        return {
            "frame_id": self.frame_id,
            "timestamp": self.timestamp,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "confidence": round(self.confidence, 4),
            "bounding_box": [round(v, 2) for v in self.bounding_box],
            "camera_id": self.camera_id,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "DetectionResult":
        """Deserialise from a plain dict."""
        return cls(
            frame_id=int(data["frame_id"]),
            timestamp=str(data["timestamp"]),
            class_id=int(data["class_id"]),
            class_name=str(data["class_name"]),
            confidence=float(data["confidence"]),
            bounding_box=list(data["bounding_box"]),
            camera_id=str(data["camera_id"]),
        )
