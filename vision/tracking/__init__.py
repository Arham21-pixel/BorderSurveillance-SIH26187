"""
vision/tracking — multi-object tracking sub-package.

Public API
----------
ByteStyleTracker : Low-level per-camera ByteTrack-style tracker.
TrackManager     : Manages one tracker per camera_id.
TrackingResult   : Typed output object for one tracked object.
"""

from vision.tracking.result import TrackingResult
from vision.tracking.track_manager import TrackManager
from vision.tracking.tracker import ByteStyleTracker, SimpleTracker

__all__ = ["ByteStyleTracker", "SimpleTracker", "TrackManager", "TrackingResult"]

