"""
vision/behaviour/analyser.py

BehaviourAnalyser — the core behaviour analytics engine.

Converts raw TrackingResult objects into BehaviourEvent objects that the
backend/intelligence layer can act on.

Detects:
  - Loitering         : object dwells in one area beyond a time threshold
  - Zone intrusion    : object enters a defined restricted polygon
  - Group gathering   : 3+ people cluster within proximity radius
  - Fast movement     : object moves unusually fast (running, sprinting)
  - Direction anomaly : object moving toward restricted zone
  - Night activity    : detections flagged as occurring at night

Outputs:
  - BehaviourEvent dataclass with classification, confidence, and features
  - features dict compatible with intelligence.risk_engine.score_event()

No database writes. No FastAPI. No Supabase. Clean Python interface.
"""
from __future__ import annotations

import datetime
import math
from dataclasses import dataclass, field
from typing import Optional

from vision.utils.geometry import centroid, movement_direction
from vision.utils.logging_config import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Output types
# ---------------------------------------------------------------------------

@dataclass
class BehaviourEvent:
    """A detected behavioural anomaly on a single track.

    Attributes
    ----------
    track_id:
        The tracker ID of the object.
    camera_id:
        Source camera.
    timestamp:
        ISO-8601 UTC timestamp at detection.
    kind:
        Event kind string compatible with intelligence.event_classifier:
        ``"loitering"``, ``"zone_intrusion"``, ``"group"``,
        ``"fast_movement"``, ``"normal"``, ``"motion"``.
    description:
        Human-readable description for the dashboard.
    confidence:
        Estimated confidence that this event is genuinely anomalous (0–1).
    features:
        Feature dict consumable by ``intelligence.risk_engine.score_event()``.
    object_class:
        Generic object class (``"person"``, ``"vehicle"``, etc.)
    bounding_box:
        Current [x1, y1, x2, y2] of the tracked object.
    trajectory:
        Centroid trajectory for this track.
    """

    track_id: str
    camera_id: str
    timestamp: str
    kind: str                              # event kind
    description: str
    confidence: float                      # 0–1
    features: dict
    object_class: str = "person"
    bounding_box: list[float] = field(default_factory=list)
    trajectory: list[tuple[float, float]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "track_id": self.track_id,
            "camera_id": self.camera_id,
            "timestamp": self.timestamp,
            "kind": self.kind,
            "description": self.description,
            "confidence": round(self.confidence, 4),
            "features": self.features,
            "object_class": self.object_class,
            "bounding_box": self.bounding_box,
            "trajectory": [list(pt) for pt in self.trajectory],
        }


# ---------------------------------------------------------------------------
# Track state (internal to the analyser)
# ---------------------------------------------------------------------------

@dataclass
class _TrackState:
    """Per-track state maintained across frames."""

    track_id: str
    camera_id: str
    object_class: str
    first_seen_ts: float          # epoch seconds
    last_update_ts: float         # epoch seconds
    centroid_history: list[tuple[float, float]] = field(default_factory=list)
    last_bounding_box: list[float] = field(default_factory=list)
    zone_entry_ts: Optional[float] = None   # epoch when zone was entered

    @property
    def dwell_seconds(self) -> float:
        return self.last_update_ts - self.first_seen_ts

    @property
    def zone_dwell_seconds(self) -> float:
        if self.zone_entry_ts is None:
            return 0.0
        return self.last_update_ts - self.zone_entry_ts

    def displacement_per_second(self, window: int = 5) -> float:
        """Estimate pixel/sec speed from recent centroid history."""
        pts = self.centroid_history[-max(2, window):]
        if len(pts) < 2:
            return 0.0
        dx = pts[-1][0] - pts[0][0]
        dy = pts[-1][1] - pts[0][1]
        dist = math.hypot(dx, dy)
        duration = max(self.dwell_seconds, 0.1)
        return dist / duration


# ---------------------------------------------------------------------------
# Main analyser class
# ---------------------------------------------------------------------------

class BehaviourAnalyser:
    """Stateful behaviour analyser for tracked objects.

    Call :meth:`analyse` once per frame with the current tracking results.

    Parameters
    ----------
    loitering_threshold:
        Seconds before a stationary object triggers a loitering event.
    group_radius:
        Pixel distance within which people are considered a group.
    group_min_size:
        Minimum number of people to constitute a group event.
    fast_movement_threshold:
        Pixel/sec above which movement is flagged as "fast".
    restricted_zones:
        Dict mapping zone_name → list of (x, y) polygon vertices.
        Objects inside these zones trigger zone_intrusion events.
    night_hours:
        Tuple of (start_hour, end_hour) UTC for night flagging.
        Default: (20, 6) = 8 PM to 6 AM.
    fps:
        Approximate frames per second of the source.
        Used to estimate dwell time from frame counts.
    """

    def __init__(
        self,
        loitering_threshold: float = 30.0,
        group_radius: float = 100.0,
        group_min_size: int = 3,
        fast_movement_threshold: float = 80.0,
        restricted_zones: dict[str, list[tuple[float, float]]] | None = None,
        night_hours: tuple[int, int] = (20, 6),
        fps: float = 12.0,
    ) -> None:
        self.loitering_threshold = loitering_threshold
        self.group_radius = group_radius
        self.group_min_size = group_min_size
        self.fast_movement_threshold = fast_movement_threshold
        self.restricted_zones: dict[str, list[tuple[float, float]]] = restricted_zones or {}
        self.night_start, self.night_end = night_hours
        self.fps = fps
        self._tracks: dict[str, _TrackState] = {}  # track_id → state

    # ── Primary interface ─────────────────────────────────────────────────────

    def analyse(
        self,
        tracked_objects: list[dict],
        camera_id: str = "default",
        timestamp: str | None = None,
    ) -> list[BehaviourEvent]:
        """Analyse a frame's tracked objects and return behaviour events.

        Parameters
        ----------
        tracked_objects:
            List of dicts in the backend integration contract format:
            each must have ``track_id``, ``object_class``, ``bounding_box``,
            ``trajectory``, ``confidence``.
        camera_id:
            Source camera identifier.
        timestamp:
            ISO-8601 UTC timestamp of the frame; auto-generated if None.

        Returns
        -------
        list[BehaviourEvent]
            Zero or more behavioural events detected this frame.
            Only anomalous events are returned (not "normal" frames).
        """
        if timestamp is None:
            timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        now_epoch = _iso_to_epoch(timestamp)
        is_night = self._is_night(now_epoch)
        events: list[BehaviourEvent] = []

        # ── Update track states ───────────────────────────────────────────────
        active_ids: set[str] = set()
        for obj in tracked_objects:
            tid = str(obj.get("track_id", ""))
            if not tid:
                continue
            active_ids.add(tid)
            self._update_track(tid, obj, camera_id, now_epoch)

        # ── Expire stale tracks ───────────────────────────────────────────────
        stale = [tid for tid in self._tracks if tid not in active_ids]
        for tid in stale:
            del self._tracks[tid]

        # ── Per-track behaviour checks ────────────────────────────────────────
        person_centroids: list[tuple[float, float]] = []
        person_track_ids: list[str] = []

        for tid, state in self._tracks.items():
            cx, cy = state.centroid_history[-1] if state.centroid_history else (0.0, 0.0)

            # Collect persons for group check
            if state.object_class == "person":
                person_centroids.append((cx, cy))
                person_track_ids.append(tid)

            # 1. Zone intrusion
            zone_event = self._check_zone_intrusion(state, timestamp, is_night)
            if zone_event:
                events.append(zone_event)
                continue  # zone intrusion is highest priority, skip other checks

            # 2. Loitering
            loiter_event = self._check_loitering(state, timestamp, is_night)
            if loiter_event:
                events.append(loiter_event)

            # 3. Fast movement
            speed_event = self._check_fast_movement(state, timestamp)
            if speed_event:
                events.append(speed_event)

        # 4. Group gathering (cross-track)
        group_events = self._check_group(person_centroids, person_track_ids, camera_id, timestamp, is_night)
        events.extend(group_events)

        logger.debug(
            "camera=%s ts=%s tracked=%d events=%d",
            camera_id, timestamp, len(tracked_objects), len(events),
        )
        return events

    def update_zones(self, zones: dict[str, list[tuple[float, float]]]) -> None:
        """Update the restricted zone definitions at runtime."""
        self.restricted_zones = zones
        logger.info("Restricted zones updated: %s", list(zones.keys()))

    def reset(self, camera_id: str | None = None) -> None:
        """Clear track state (optionally for a specific camera only)."""
        if camera_id:
            to_remove = [tid for tid, s in self._tracks.items() if s.camera_id == camera_id]
            for tid in to_remove:
                del self._tracks[tid]
        else:
            self._tracks.clear()
        logger.info("BehaviourAnalyser reset (camera=%s).", camera_id or "ALL")

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _update_track(
        self,
        tid: str,
        obj: dict,
        camera_id: str,
        now_epoch: float,
    ) -> None:
        bbox = obj.get("bounding_box", [0, 0, 1, 1])
        obj_class = str(obj.get("object_class", "person"))
        trajectory = obj.get("trajectory", [])
        cx, cy = centroid(bbox)

        if tid not in self._tracks:
            self._tracks[tid] = _TrackState(
                track_id=tid,
                camera_id=camera_id,
                object_class=obj_class,
                first_seen_ts=now_epoch,
                last_update_ts=now_epoch,
                centroid_history=[(cx, cy)],
                last_bounding_box=list(bbox),
            )
        else:
            state = self._tracks[tid]
            state.last_update_ts = now_epoch
            state.last_bounding_box = list(bbox)
            state.centroid_history.append((cx, cy))
            if len(state.centroid_history) > 200:
                state.centroid_history.pop(0)

    def _check_zone_intrusion(
        self,
        state: _TrackState,
        timestamp: str,
        is_night: bool,
    ) -> BehaviourEvent | None:
        """Return a zone_intrusion event if the object is inside a restricted zone."""
        from vision.behaviour.zone_detection import centroid_in_zone

        for zone_name, polygon in self.restricted_zones.items():
            if centroid_in_zone(state.last_bounding_box, polygon):
                # Track zone entry time
                if state.zone_entry_ts is None:
                    state.zone_entry_ts = state.last_update_ts
                zone_dwell = state.zone_dwell_seconds

                features = {
                    "zone_restricted": True,
                    "dwell_seconds": zone_dwell,
                    "group_size": 1,
                    "night": is_night,
                    "vehicle_near_fence": state.object_class == "vehicle",
                    "zone_name": zone_name,
                }
                conf = min(0.95, 0.70 + 0.05 * (zone_dwell / 10))
                return BehaviourEvent(
                    track_id=state.track_id,
                    camera_id=state.camera_id,
                    timestamp=timestamp,
                    kind="zone_intrusion",
                    description=f"{state.object_class.title()} in restricted zone '{zone_name}' "
                                f"({zone_dwell:.0f}s dwell)",
                    confidence=conf,
                    features=features,
                    object_class=state.object_class,
                    bounding_box=state.last_bounding_box,
                    trajectory=list(state.centroid_history),
                )
            else:
                # Exited zone — reset timer
                state.zone_entry_ts = None

        return None

    def _check_loitering(
        self,
        state: _TrackState,
        timestamp: str,
        is_night: bool,
    ) -> BehaviourEvent | None:
        """Return a loitering event if the object has dwelt beyond the threshold."""
        dwell = state.dwell_seconds
        if dwell < self.loitering_threshold:
            return None

        # Check displacement — only flag if the object hasn't moved much
        speed = state.displacement_per_second(window=10)
        if speed > self.fast_movement_threshold * 0.5:
            return None  # moving too fast to be loitering

        features = {
            "zone_restricted": False,
            "dwell_seconds": dwell,
            "group_size": 1,
            "night": is_night,
            "vehicle_near_fence": False,
        }
        conf = min(0.90, 0.55 + 0.01 * (dwell - self.loitering_threshold))
        return BehaviourEvent(
            track_id=state.track_id,
            camera_id=state.camera_id,
            timestamp=timestamp,
            kind="loitering",
            description=f"{state.object_class.title()} loitering for {dwell:.0f}s",
            confidence=conf,
            features=features,
            object_class=state.object_class,
            bounding_box=state.last_bounding_box,
            trajectory=list(state.centroid_history),
        )

    def _check_fast_movement(
        self,
        state: _TrackState,
        timestamp: str,
    ) -> BehaviourEvent | None:
        """Return a fast_movement event if the object is moving unusually fast."""
        speed = state.displacement_per_second(window=5)
        if speed < self.fast_movement_threshold:
            return None

        direction = movement_direction(state.centroid_history, smoothing=5)
        features = {
            "zone_restricted": False,
            "dwell_seconds": state.dwell_seconds,
            "group_size": 1,
            "night": False,
            "vehicle_near_fence": False,
            "speed_px_per_sec": round(speed, 1),
            "direction": direction,
        }
        conf = min(0.85, 0.55 + (speed - self.fast_movement_threshold) / 200)
        return BehaviourEvent(
            track_id=state.track_id,
            camera_id=state.camera_id,
            timestamp=timestamp,
            kind="fast_movement",
            description=f"{state.object_class.title()} moving fast ({speed:.0f} px/s, dir={direction})",
            confidence=conf,
            features=features,
            object_class=state.object_class,
            bounding_box=state.last_bounding_box,
            trajectory=list(state.centroid_history),
        )

    def _check_group(
        self,
        centroids: list[tuple[float, float]],
        track_ids: list[str],
        camera_id: str,
        timestamp: str,
        is_night: bool,
    ) -> list[BehaviourEvent]:
        """Detect group gatherings of 3+ people within proximity radius."""
        if len(centroids) < self.group_min_size:
            return []

        # Simple distance-based clustering
        used: set[int] = set()
        events: list[BehaviourEvent] = []

        for i in range(len(centroids)):
            if i in used:
                continue
            group = [i]
            for j in range(len(centroids)):
                if i == j or j in used:
                    continue
                dist = math.hypot(
                    centroids[i][0] - centroids[j][0],
                    centroids[i][1] - centroids[j][1],
                )
                if dist <= self.group_radius:
                    group.append(j)

            if len(group) >= self.group_min_size:
                used.update(group)
                group_track_ids = [track_ids[k] for k in group]
                features = {
                    "zone_restricted": False,
                    "dwell_seconds": 0,
                    "group_size": len(group),
                    "night": is_night,
                    "vehicle_near_fence": False,
                }
                conf = min(0.88, 0.60 + 0.05 * (len(group) - self.group_min_size))
                cx_mean = sum(centroids[k][0] for k in group) / len(group)
                cy_mean = sum(centroids[k][1] for k in group) / len(group)
                events.append(
                    BehaviourEvent(
                        track_id=group_track_ids[0],
                        camera_id=camera_id,
                        timestamp=timestamp,
                        kind="group",
                        description=f"Group of {len(group)} persons clustered at ({cx_mean:.0f},{cy_mean:.0f})",
                        confidence=conf,
                        features=features,
                        object_class="person",
                        bounding_box=[cx_mean - 50, cy_mean - 100, cx_mean + 50, cy_mean + 100],
                        trajectory=[],
                    )
                )

        return events

    def _is_night(self, epoch: float) -> bool:
        """Return True if epoch falls within night hours."""
        dt = datetime.datetime.utcfromtimestamp(epoch)
        hour = dt.hour
        start, end = self.night_start, self.night_end
        if start > end:  # wraps midnight, e.g. 20–6
            return hour >= start or hour < end
        return start <= hour < end


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _iso_to_epoch(ts: str) -> float:
    """Parse ISO-8601 string to epoch float."""
    try:
        ts = ts.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(ts).timestamp()
    except Exception:
        return datetime.datetime.utcnow().timestamp()
