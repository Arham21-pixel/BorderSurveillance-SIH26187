"""
vision/tracking/tracker.py

ByteTrack-style multi-object tracker — no backend dependency.

This module implements a pure-Python IoU tracker with ByteTrack
two-stage association logic:
  1. High-confidence detections are matched to existing tracks first.
  2. Low-confidence detections are matched to unmatched tracks second.

All geometry utilities are sourced from vision.utils.geometry (local),
NOT from any backend module.

For production, you can swap this for the ``supervision.ByteTrack``
implementation by setting ``use_supervision=True`` in TrackConfig.
"""
from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from typing import Optional

from vision.detection.classes import generic_class
from vision.detection.result import DetectionResult
from vision.tracking.result import TrackingResult
from vision.utils.geometry import centroid, iou, movement_direction
from vision.utils.logging_config import get_logger

logger = get_logger(__name__)

# Maximum number of centroid history points to keep per track
_MAX_TRAJECTORY_LEN = 200


@dataclass
class _Track:
    """Internal track state — not exposed outside this module."""

    track_id: str
    class_name: str
    confidence: float
    bounding_box: list[float]
    trajectory: list[tuple[float, float]] = field(default_factory=list)
    age: int = 0           # frames since last matched detection
    first_seen: str = ""
    last_seen: str = ""
    camera_id: str = "default"

    def update(self, detection: DetectionResult) -> None:
        """Merge new detection data into this track."""
        self.class_name = detection.class_name
        self.confidence = detection.confidence
        self.bounding_box = detection.bounding_box
        self.age = 0
        self.last_seen = detection.timestamp
        self.camera_id = detection.camera_id

        cx, cy = centroid(detection.bounding_box)
        self.trajectory.append((cx, cy))
        if len(self.trajectory) > _MAX_TRAJECTORY_LEN:
            self.trajectory.pop(0)

    def to_tracking_result(self, timestamp: str) -> TrackingResult:
        direction = movement_direction(self.trajectory)
        return TrackingResult(
            track_id=self.track_id,
            object_class=generic_class(self.class_name),
            confidence=self.confidence,
            bounding_box=self.bounding_box,
            timestamp=timestamp,
            camera_id=self.camera_id,
            trajectory=list(self.trajectory),
            movement_direction=direction,
            first_seen=self.first_seen,
            last_seen=self.last_seen,
        )


class ByteStyleTracker:
    """IoU-based multi-object tracker with ByteTrack two-stage association.

    Parameters
    ----------
    max_age:
        Frames a track can be unmatched before it is removed.  Default: 30.
    iou_threshold_high:
        IoU threshold for high-confidence track matching.  Default: 0.5.
    iou_threshold_low:
        IoU threshold for low-confidence second-stage matching.  Default: 0.3.
    high_conf_threshold:
        Detection confidence at/above which a detection is treated as
        "high confidence" in the first pass.  Default: 0.5.
    """

    def __init__(
        self,
        max_age: int = 30,
        iou_threshold_high: float = 0.5,
        iou_threshold_low: float = 0.3,
        high_conf_threshold: float = 0.5,
    ) -> None:
        self.max_age = max_age
        self.iou_threshold_high = iou_threshold_high
        self.iou_threshold_low = iou_threshold_low
        self.high_conf_threshold = high_conf_threshold
        self._tracks: dict[str, _Track] = {}
        self._next_id: int = 1

    # ── Public interface ─────────────────────────────────────────────────────

    def update(
        self,
        detections: list[DetectionResult],
        timestamp: str | None = None,
    ) -> list[TrackingResult]:
        """Update tracker state with new detections and return active tracks.

        Parameters
        ----------
        detections:
            List of DetectionResult objects from the current frame.
        timestamp:
            ISO-8601 frame timestamp; auto-generated if None.

        Returns
        -------
        list[TrackingResult]
            All currently active tracks (matched + continuing unmatched).
        """
        if timestamp is None:
            timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        # ── Stage 1: Match high-confidence detections ─────────────────────
        high_conf = [d for d in detections if d.confidence >= self.high_conf_threshold]
        low_conf = [d for d in detections if d.confidence < self.high_conf_threshold]

        matched_track_ids: set[str] = set()
        matched_det_indices: set[int] = set()

        matched_track_ids, matched_det_indices = self._match(
            high_conf, matched_track_ids, matched_det_indices, self.iou_threshold_high
        )

        # ── Stage 2: Match low-confidence detections to unmatched tracks ──
        matched_track_ids, _ = self._match(
            low_conf, matched_track_ids, set(), self.iou_threshold_low
        )

        # ── Create new tracks for unmatched high-conf detections ──────────
        for idx, det in enumerate(high_conf):
            if idx not in matched_det_indices:
                self._create_track(det, timestamp)

        # ── Age out unmatched tracks ──────────────────────────────────────
        stale_ids = [
            tid for tid, t in self._tracks.items()
            if tid not in matched_track_ids
        ]
        for tid in stale_ids:
            self._tracks[tid].age += 1
            if self._tracks[tid].age > self.max_age:
                logger.debug("Track %s expired (age > %d)", tid, self.max_age)
                del self._tracks[tid]

        results = [t.to_tracking_result(timestamp) for t in self._tracks.values()]
        logger.debug("timestamp=%s → %d active tracks", timestamp, len(results))
        return results

    def reset(self) -> None:
        """Clear all track state — call when switching camera/video sources."""
        self._tracks.clear()
        self._next_id = 1
        logger.info("Tracker reset.")

    # ── Private helpers ──────────────────────────────────────────────────────

    def _match(
        self,
        detections: list[DetectionResult],
        already_matched_tracks: set[str],
        already_matched_dets: set[int],
        threshold: float,
    ) -> tuple[set[str], set[int]]:
        matched_tracks = set(already_matched_tracks)
        matched_dets = set(already_matched_dets)

        for det_idx, det in enumerate(detections):
            best_track_id: str | None = None
            best_score: float = threshold

            for tid, track in self._tracks.items():
                if tid in matched_tracks:
                    continue
                score = iou(det.bounding_box, track.bounding_box)
                if score > best_score:
                    best_score = score
                    best_track_id = tid

            if best_track_id is not None:
                self._tracks[best_track_id].update(det)
                matched_tracks.add(best_track_id)
                matched_dets.add(det_idx)

        return matched_tracks, matched_dets

    def _create_track(self, detection: DetectionResult, timestamp: str) -> str:
        tid = f"T{self._next_id:04d}"
        self._next_id += 1
        cx, cy = centroid(detection.bounding_box)
        track = _Track(
            track_id=tid,
            class_name=detection.class_name,
            confidence=detection.confidence,
            bounding_box=detection.bounding_box,
            trajectory=[(cx, cy)],
            age=0,
            first_seen=timestamp,
            last_seen=timestamp,
            camera_id=detection.camera_id,
        )
        self._tracks[tid] = track
        logger.debug("New track %s for class '%s'", tid, detection.class_name)
        return tid

    @property
    def active_track_count(self) -> int:
        """Number of currently active tracks."""
        return len(self._tracks)
