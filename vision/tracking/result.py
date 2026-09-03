"""
vision/tracking/result.py

Typed output object for tracked objects.
The backend/intelligence layer consumes TrackingResult objects —
it never needs to import ByteTrack or tracker internals.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TrackingResult:
    """A single tracked object with full history.

    Attributes
    ----------
    track_id:
        Stable identifier assigned by the tracker.  Persists across frames
        as long as the object is visible.
    object_class:
        Generic class label, e.g. ``"person"``, ``"vehicle"``, ``"animal"``.
    confidence:
        Latest detection confidence in [0, 1].
    bounding_box:
        ``[x1, y1, x2, y2]`` pixel coordinates in the current frame.
    timestamp:
        ISO-8601 UTC timestamp of the current frame.
    camera_id:
        Identifier for the originating camera/source.
    trajectory:
        Ordered list of ``(cx, cy)`` centroid positions, oldest first.
        Updated every frame the object is visible.
    movement_direction:
        Estimated cardinal direction (``"N"``, ``"NE"``, ..., ``"stationary"``)
        or ``None`` if insufficient trajectory data.
    first_seen:
        ISO-8601 timestamp when this track was first created.
    last_seen:
        ISO-8601 timestamp of the most recent detection.
    """

    track_id: str
    object_class: str
    confidence: float
    bounding_box: list[float]          # [x1, y1, x2, y2]
    timestamp: str
    camera_id: str
    trajectory: list[tuple[float, float]] = field(default_factory=list)
    movement_direction: Optional[str] = None
    first_seen: str = ""
    last_seen: str = ""

    def to_dict(self) -> dict:
        """Serialise to a plain dict for JSON transport."""
        return {
            "track_id": self.track_id,
            "object_class": self.object_class,
            "confidence": round(self.confidence, 4),
            "bounding_box": [round(v, 2) for v in self.bounding_box],
            "timestamp": self.timestamp,
            "camera_id": self.camera_id,
            "trajectory": [list(pt) for pt in self.trajectory],
            "movement_direction": self.movement_direction,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TrackingResult":
        """Deserialise from a plain dict."""
        return cls(
            track_id=str(data["track_id"]),
            object_class=str(data["object_class"]),
            confidence=float(data["confidence"]),
            bounding_box=list(data["bounding_box"]),
            timestamp=str(data["timestamp"]),
            camera_id=str(data["camera_id"]),
            trajectory=[tuple(pt) for pt in data.get("trajectory", [])],
            movement_direction=data.get("movement_direction"),
            first_seen=str(data.get("first_seen", "")),
            last_seen=str(data.get("last_seen", "")),
        )
