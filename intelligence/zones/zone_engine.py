from __future__ import annotations

from dataclasses import dataclass

from intelligence.zones.geometry import point_in_polygon, segment_crosses_polygon_boundary


@dataclass(slots=True)
class ZoneState:
    track_zone_presence: dict[str, set[str]]


@dataclass(slots=True)
class ZoneEvent:
    event_type: str
    zone_id: str
    zone_type: str
    severity: str
    reason: str


class ZoneEngine:
    def __init__(self) -> None:
        self.state = ZoneState(track_zone_presence={})

    @staticmethod
    def _to_polygon(raw: list[dict] | list[tuple[float, float]]) -> list[tuple[float, float]]:
        points: list[tuple[float, float]] = []
        for item in raw:
            if isinstance(item, dict):
                points.append((float(item["x"]), float(item["y"])))
            else:
                points.append((float(item[0]), float(item[1])))
        return points

    def analyze(
        self,
        track_key: str,
        prev_point: tuple[float, float] | None,
        curr_point: tuple[float, float],
        zones: list[dict],
    ) -> list[ZoneEvent]:
        previous = self.state.track_zone_presence.get(track_key, set())
        current: set[str] = set()
        events: list[ZoneEvent] = []

        for zone in zones:
            polygon = self._to_polygon(zone.get("polygon") or [])
            if len(polygon) < 3:
                continue
            in_zone = point_in_polygon(curr_point, polygon)
            zone_id = str(zone["id"])
            zone_type = str(zone.get("zone_type", "MONITOR"))
            severity = str(zone.get("severity", "MEDIUM"))
            if in_zone:
                current.add(zone_id)

            if zone_id not in previous and in_zone:
                event_type = "restricted_zone_entry" if zone_type == "RESTRICTED" else "zone_entry"
                events.append(
                    ZoneEvent(event_type=event_type, zone_id=zone_id, zone_type=zone_type, severity=severity, reason="Zone entry detected.")
                )
            elif zone_id in previous and not in_zone:
                events.append(ZoneEvent(event_type="zone_exit", zone_id=zone_id, zone_type=zone_type, severity=severity, reason="Zone exit detected."))

            if prev_point is not None and segment_crosses_polygon_boundary(prev_point, curr_point, polygon):
                events.append(
                    ZoneEvent(
                        event_type="zone_boundary_crossing",
                        zone_id=zone_id,
                        zone_type=zone_type,
                        severity=severity,
                        reason="Boundary crossing detected.",
                    )
                )

        self.state.track_zone_presence[track_key] = current
        return events
