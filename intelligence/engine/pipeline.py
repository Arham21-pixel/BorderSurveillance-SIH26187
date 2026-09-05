from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import NAMESPACE_DNS, uuid5

from backend.core.config import settings
from backend.schemas.ingest import DetectionInput
from intelligence.behaviour.grouping import detect_group_movement
from intelligence.behaviour.loitering import LoiterState, evaluate_loitering
from intelligence.behaviour.movement import infer_direction
from intelligence.engine.event_engine import EventEngine
from intelligence.risk.risk_engine import RiskContext
from intelligence.tracking.trajectory import TrajectoryStore, detect_unusual_trajectory
from intelligence.zones.zone_engine import ZoneEngine


@dataclass(slots=True)
class PipelineResult:
    event_id: str
    event_type: str
    risk_result: object
    context: dict
    track_uuid: str


class IntelligencePipeline:
    def __init__(self) -> None:
        self.trajectory = TrajectoryStore()
        self.zone_engine = ZoneEngine()
        self.event_engine = EventEngine()
        self.loiter_state = LoiterState(first_seen_at={}, last_emitted_at={})
        self._active_tracks: dict[str, tuple[float, float]] = {}

    @staticmethod
    def _center(box) -> tuple[float, float]:
        return ((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2)

    @staticmethod
    def _is_night(ts: datetime) -> bool:
        hour = ts.hour
        return hour >= settings.risk_night_start_hour or hour <= settings.risk_night_end_hour

    def process_detection(self, detection: DetectionInput, zones: list[dict]) -> PipelineResult:
        track_key = f"{detection.camera_id}:{detection.track_id}"
        track_uuid = str(uuid5(NAMESPACE_DNS, track_key))
        curr = self._center(detection.bounding_box)
        prev = self.trajectory.get(track_key)[-1] if self.trajectory.get(track_key) else None
        self.trajectory.add(track_key, curr)

        zone_events = self.zone_engine.analyze(track_key=track_key, prev_point=prev, curr_point=curr, zones=zones)
        direction = infer_direction(prev, curr).value
        loitering, dwell_time = evaluate_loitering(
            state=self.loiter_state,
            track_key=track_key,
            current_timestamp=detection.timestamp,
            threshold_seconds=settings.loitering_seconds,
            dedupe_seconds=settings.event_dedupe_seconds,
        )

        self._active_tracks[track_key] = curr
        active_rows = [
            {"track_id": key, "center": center}
            for key, center in self._active_tracks.items()
            if key.startswith(f"{detection.camera_id}:")
        ]
        groups = detect_group_movement(
            active_tracks=active_rows,
            distance_threshold=settings.group_distance_threshold,
            min_members=settings.group_min_members,
        )
        group_detected = any(track_key in group for group in groups)

        restricted_violation = any(evt.event_type == "restricted_zone_entry" for evt in zone_events)
        unusual = detect_unusual_trajectory(direction=direction, expected_directions=detection.attributes.get("expected_directions"))

        event_type = "movement_observed"
        reasons: list[str] = []
        if restricted_violation:
            event_type = "restricted_zone_entry"
            reasons.append("Restricted zone entry")
        elif loitering:
            event_type = "loitering"
            reasons.append("Loitering threshold exceeded")
        elif group_detected:
            event_type = "group_movement"
            reasons.append("Grouped movement detected")
        elif unusual:
            event_type = "unusual_trajectory"
            reasons.append("Unusual movement direction")

        dedupe_key = f"{track_key}:{event_type}"
        repeated = not self.event_engine.should_emit(dedupe_key, detection.timestamp, settings.event_dedupe_seconds)

        # Toward-boundary: flagged by zone engine or explicitly passed via attributes
        toward_boundary = any(
            evt.event_type in ("boundary_crossing", "toward_boundary")
            for evt in zone_events
            if not isinstance(evt, dict)
        ) or bool(detection.attributes.get("toward_boundary"))

        # Animal / benign-object context  (PRD: -40 contributor)
        is_animal = detection.object_class.lower() in (
            "animal", "bird", "cat", "dog", "horse", "cow", "sheep",
        ) or bool(detection.attributes.get("is_animal"))

        # Normal trajectory: no anomalies flagged at all
        normal_trajectory_ok = (
            not restricted_violation
            and not loitering
            and not toward_boundary
            and not group_detected
            and not unusual
        )

        risk_context = RiskContext(
            event_id=track_uuid,
            timestamp=detection.timestamp,
            object_class=detection.object_class,
            detection_confidence=detection.confidence,
            zone_type=(zone_events[0].zone_type if zone_events else None),
            restricted_zone_violation=restricted_violation,
            direction=direction,
            toward_boundary=toward_boundary,
            normal_trajectory=normal_trajectory_ok,
            dwell_time=dwell_time,
            loitering=loitering,
            group_movement=group_detected,
            is_animal=is_animal,
            night_time=self._is_night(detection.timestamp) or bool(detection.attributes.get("night")),
            repeated_event=repeated,
        )
        zone_event_payload = []
        for evt in zone_events:
            if isinstance(evt, dict):
                zone_event_payload.append(evt)
            else:
                zone_event_payload.append(
                    {
                        "event_type": evt.event_type,
                        "zone_id": evt.zone_id,
                        "zone_type": evt.zone_type,
                        "severity": evt.severity,
                        "reason": evt.reason,
                    }
                )

        context = {
            "bbox": detection.bounding_box.model_dump(),
            "direction": direction,
            "dwell_time": dwell_time,
            "zone_events": zone_event_payload,
            "group_detected": group_detected,
            "toward_boundary": toward_boundary,
            "is_animal": is_animal,
            "unusual_trajectory": unusual,
            "normal_trajectory": normal_trajectory_ok,
            "reasons": reasons,
        }
        built = self.event_engine.build_event(event_type=event_type, risk_context=risk_context, context=context)
        return PipelineResult(
            event_id=built.event_id,
            event_type=built.event_type,
            risk_result=built.risk_result,
            context=built.context,
            track_uuid=track_uuid,
        )
