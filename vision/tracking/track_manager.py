"""
vision/tracking/track_manager.py

Per-camera tracker management.

Maintains one ByteStyleTracker instance per camera_id so that tracks from
different cameras never interfere.  Call reset(camera_id) when a video
source restarts or changes.
"""
from __future__ import annotations

from vision.detection.result import DetectionResult
from vision.tracking.result import TrackingResult
from vision.tracking.tracker import ByteStyleTracker
from vision.utils.logging_config import get_logger

logger = get_logger(__name__)


class TrackManager:
    """Manages one tracker per camera source.

    Parameters
    ----------
    max_age:
        Frames before an unmatched track is discarded.
    iou_threshold_high:
        IoU threshold for first-stage (high-confidence) matching.
    iou_threshold_low:
        IoU threshold for second-stage (low-confidence) matching.
    high_conf_threshold:
        Detection confidence boundary between high/low confidence tiers.
    """

    def __init__(
        self,
        max_age: int = 30,
        iou_threshold_high: float = 0.5,
        iou_threshold_low: float = 0.3,
        high_conf_threshold: float = 0.5,
    ) -> None:
        self._max_age = max_age
        self._iou_high = iou_threshold_high
        self._iou_low = iou_threshold_low
        self._high_conf = high_conf_threshold
        self._trackers: dict[str, ByteStyleTracker] = {}

    # ── Public API ───────────────────────────────────────────────────────────

    def update(
        self,
        camera_id: str,
        detections: list[DetectionResult],
        timestamp: str | None = None,
    ) -> list[TrackingResult]:
        """Update the tracker for *camera_id* and return its active tracks.

        A new tracker is created automatically on first call for a camera.

        Parameters
        ----------
        camera_id:
            Identifier of the originating camera/source.
        detections:
            Current-frame detections from the Detector.
        timestamp:
            ISO-8601 frame timestamp; auto-generated if None.

        Returns
        -------
        list[TrackingResult]
            Active tracked objects for this camera.
        """
        tracker = self._get_or_create(camera_id)
        return tracker.update(detections, timestamp=timestamp)

    def reset(self, camera_id: str) -> None:
        """Reset the tracker for a specific camera (e.g. on source restart)."""
        if camera_id in self._trackers:
            self._trackers[camera_id].reset()
            logger.info("Tracker reset for camera '%s'", camera_id)

    def reset_all(self) -> None:
        """Reset all camera trackers."""
        for cam_id in list(self._trackers.keys()):
            self._trackers[cam_id].reset()
        logger.info("All trackers reset.")

    def active_cameras(self) -> list[str]:
        """Return list of camera IDs with active trackers."""
        return list(self._trackers.keys())

    def track_count(self, camera_id: str) -> int:
        """Return number of active tracks for a camera (0 if unknown)."""
        tracker = self._trackers.get(camera_id)
        return tracker.active_track_count if tracker else 0

    # ── Internal ─────────────────────────────────────────────────────────────

    def _get_or_create(self, camera_id: str) -> ByteStyleTracker:
        if camera_id not in self._trackers:
            logger.info("Creating new tracker for camera '%s'", camera_id)
            self._trackers[camera_id] = ByteStyleTracker(
                max_age=self._max_age,
                iou_threshold_high=self._iou_high,
                iou_threshold_low=self._iou_low,
                high_conf_threshold=self._high_conf,
            )
        return self._trackers[camera_id]
