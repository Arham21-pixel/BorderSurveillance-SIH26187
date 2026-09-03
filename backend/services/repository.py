"""Repository abstraction used by services."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from backend.core.config import settings
from backend.core.errors import AppError
from backend.schemas.alert import AlertStatusUpdate
from backend.schemas.camera import CameraCreate, CameraUpdate
from backend.schemas.evidence import EvidenceInput
from backend.schemas.zone import ZoneCreate, ZoneUpdate
from backend.services.supabase_client import SupabaseClientFactory


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BaseRepository:
    def list_cameras(self) -> list[dict]:
        raise NotImplementedError

    def get_camera(self, camera_id: UUID) -> dict | None:
        raise NotImplementedError

    def create_camera(self, payload: CameraCreate) -> dict:
        raise NotImplementedError

    def update_camera(self, camera_id: UUID, payload: CameraUpdate) -> dict | None:
        raise NotImplementedError

    def delete_camera(self, camera_id: UUID) -> bool:
        raise NotImplementedError


class SupabaseRepository(BaseRepository):
    def __init__(self) -> None:
        self.client = SupabaseClientFactory.get_service_client()

    def _execute(self, builder) -> list[dict]:
        result = builder.execute()
        return list(result.data or [])

    def list_cameras(self) -> list[dict]:
        return self._execute(self.client.table("cameras").select("*").order("created_at", desc=True))

    def get_camera(self, camera_id: UUID) -> dict | None:
        rows = self._execute(self.client.table("cameras").select("*").eq("id", str(camera_id)).limit(1))
        return rows[0] if rows else None

    def create_camera(self, payload: CameraCreate) -> dict:
        row = payload.model_dump()
        row["id"] = str(uuid4())
        now = _utcnow().isoformat()
        row["created_at"] = now
        row["updated_at"] = now
        rows = self._execute(self.client.table("cameras").insert(row))
        if not rows:
            raise AppError("Camera could not be created.", "create_failed", 500)
        return rows[0]

    def update_camera(self, camera_id: UUID, payload: CameraUpdate) -> dict | None:
        row = payload.model_dump(exclude_none=True)
        if not row:
            return self.get_camera(camera_id)
        row["updated_at"] = _utcnow().isoformat()
        rows = self._execute(self.client.table("cameras").update(row).eq("id", str(camera_id)))
        return rows[0] if rows else None

    def delete_camera(self, camera_id: UUID) -> bool:
        rows = self._execute(self.client.table("cameras").delete().eq("id", str(camera_id)))
        return bool(rows)

    def list_zones(self, camera_id: UUID | None = None) -> list[dict]:
        query = self.client.table("zones").select("*").order("created_at", desc=True)
        if camera_id:
            query = query.eq("camera_id", str(camera_id))
        return self._execute(query)

    def create_zone(self, payload: ZoneCreate) -> dict:
        row = payload.model_dump()
        row["id"] = str(uuid4())
        row["polygon"] = [{"x": x, "y": y} for x, y in row["polygon"]]
        row["created_at"] = _utcnow().isoformat()
        rows = self._execute(self.client.table("zones").insert(row))
        return rows[0]

    def update_zone(self, zone_id: UUID, payload: ZoneUpdate) -> dict | None:
        row = payload.model_dump(exclude_none=True)
        if "polygon" in row:
            row["polygon"] = [{"x": x, "y": y} for x, y in row["polygon"]]
        rows = self._execute(self.client.table("zones").update(row).eq("id", str(zone_id)))
        return rows[0] if rows else None

    def delete_zone(self, zone_id: UUID) -> bool:
        rows = self._execute(self.client.table("zones").delete().eq("id", str(zone_id)))
        return bool(rows)

    def list_events(self, filters: dict[str, Any], limit: int, offset: int) -> tuple[list[dict], int]:
        query = self.client.table("behaviour_events").select("*", count="exact").order("timestamp", desc=True)
        if filters.get("camera_id"):
            query = query.eq("camera_id", str(filters["camera_id"]))
        if filters.get("event_type"):
            query = query.eq("event_type", filters["event_type"])
        if filters.get("start_at"):
            query = query.gte("timestamp", filters["start_at"].isoformat())
        if filters.get("end_at"):
            query = query.lte("timestamp", filters["end_at"].isoformat())
        result = query.range(offset, offset + limit - 1).execute()
        return list(result.data or []), int(result.count or 0)

    def get_event(self, event_id: UUID) -> dict | None:
        rows = self._execute(self.client.table("behaviour_events").select("*").eq("id", str(event_id)).limit(1))
        return rows[0] if rows else None

    def create_event(self, payload: dict[str, Any]) -> dict:
        payload = {**payload, "id": str(uuid4())}
        rows = self._execute(self.client.table("behaviour_events").insert(payload))
        return rows[0]

    def create_risk_score(self, payload: dict[str, Any]) -> dict:
        payload = {**payload, "id": str(uuid4())}
        rows = self._execute(self.client.table("risk_scores").insert(payload))
        return rows[0]

    def create_alert(self, payload: dict[str, Any]) -> dict:
        payload = {**payload, "id": str(uuid4()), "created_at": _utcnow().isoformat()}
        rows = self._execute(self.client.table("alerts").insert(payload))
        return rows[0]

    def list_alerts(self, filters: dict[str, Any], limit: int, offset: int) -> tuple[list[dict], int]:
        query = self.client.table("alerts").select("*", count="exact").order("created_at", desc=True)
        if filters.get("camera_id"):
            query = query.eq("camera_id", str(filters["camera_id"]))
        if filters.get("severity"):
            query = query.eq("severity", filters["severity"])
        if filters.get("status"):
            query = query.eq("status", filters["status"])
        if filters.get("start_at"):
            query = query.gte("created_at", filters["start_at"].isoformat())
        if filters.get("end_at"):
            query = query.lte("created_at", filters["end_at"].isoformat())
        result = query.range(offset, offset + limit - 1).execute()
        return list(result.data or []), int(result.count or 0)

    def get_alert(self, alert_id: UUID) -> dict | None:
        rows = self._execute(self.client.table("alerts").select("*").eq("id", str(alert_id)).limit(1))
        return rows[0] if rows else None

    def update_alert_status(self, alert_id: UUID, status_update: AlertStatusUpdate, user_id: UUID | None) -> dict | None:
        patch: dict[str, Any] = {"status": status_update.status}
        if status_update.status == "ACKNOWLEDGED":
            patch["acknowledged_at"] = _utcnow().isoformat()
            if user_id:
                patch["acknowledged_by"] = str(user_id)
        rows = self._execute(self.client.table("alerts").update(patch).eq("id", str(alert_id)))
        return rows[0] if rows else None

    def create_evidence(self, payload: EvidenceInput) -> dict:
        row = payload.model_dump(mode="json")
        row["id"] = str(uuid4())
        row["snapshot_url"] = row.pop("snapshot_ref", None)
        row["video_clip_url"] = row.pop("video_clip_ref", None)
        row["created_at"] = _utcnow().isoformat()
        rows = self._execute(self.client.table("evidence").insert(row))
        return rows[0]

    def get_evidence_for_alert(self, alert_id: UUID) -> list[dict]:
        return self._execute(self.client.table("evidence").select("*").eq("alert_id", str(alert_id)))

    def analytics_summary(self) -> dict[str, Any]:
        alerts = self._execute(self.client.table("alerts").select("severity,risk_score,camera_id"))
        total = len(alerts)
        by_severity: dict[str, int] = defaultdict(int)
        by_camera: dict[str, int] = defaultdict(int)
        risk_sum = 0.0
        for row in alerts:
            by_severity[row.get("severity", "UNKNOWN")] += 1
            by_camera[row.get("camera_id", "unknown")] += 1
            risk_sum += float(row.get("risk_score") or 0.0)
        active = sorted(by_camera.items(), key=lambda item: item[1], reverse=True)[:5]
        return {
            "total_alerts": total,
            "avg_risk_score": round(risk_sum / total, 2) if total else 0.0,
            "alerts_by_severity": dict(by_severity),
            "most_active_cameras": [{"camera_id": camera_id, "count": count} for camera_id, count in active],
        }

    def analytics_alerts(self) -> dict[str, Any]:
        alerts = self._execute(self.client.table("alerts").select("id,camera_id,severity,created_at,risk_score,status"))
        by_camera: dict[str, int] = defaultdict(int)
        over_time: dict[str, int] = defaultdict(int)
        for row in alerts:
            by_camera[row["camera_id"]] += 1
            date_key = str(row["created_at"])[:10]
            over_time[date_key] += 1
        return {
            "alerts_by_camera": [{"camera_id": cam, "count": count} for cam, count in by_camera.items()],
            "alerts_over_time": [{"date": d, "count": c} for d, c in sorted(over_time.items())],
            "recent_incidents": sorted(alerts, key=lambda r: r["created_at"], reverse=True)[:10],
        }

    def analytics_risk(self) -> dict[str, Any]:
        risk_rows = self._execute(self.client.table("risk_scores").select("score,severity,event_id"))
        events = self._execute(self.client.table("behaviour_events").select("id,event_type"))
        event_map = {row["id"]: row["event_type"] for row in events}
        by_severity: dict[str, int] = defaultdict(int)
        by_event: dict[str, int] = defaultdict(int)
        total = 0.0
        for row in risk_rows:
            by_severity[row.get("severity", "UNKNOWN")] += 1
            event_id = row.get("event_id")
            if event_id in event_map:
                by_event[event_map[event_id]] += 1
            total += float(row.get("score") or 0.0)
        count = len(risk_rows)
        return {
            "average_risk_score": round(total / count, 2) if count else 0.0,
            "risk_distribution": dict(by_severity),
            "event_type_counts": dict(by_event),
        }


class InMemoryRepository(BaseRepository):
    def __init__(self) -> None:
        now = _utcnow().isoformat()
        camera_id = str(uuid4())
        self.cameras: dict[str, dict] = {
            camera_id: {
                "id": camera_id,
                "name": "North Gate Cam",
                "camera_code": "NG-01",
                "location": "North Sector Fence",
                "latitude": 34.1526,
                "longitude": 77.5771,
                "stream_ref": "0",
                "status": "ACTIVE",
                "created_at": now,
                "updated_at": now,
            }
        }
        self.zones: dict[str, dict] = {}
        self.events: dict[str, dict] = {}
        self.risk_scores: dict[str, dict] = {}
        self.alerts: dict[str, dict] = {}
        self.evidence: dict[str, dict] = {}

    def list_cameras(self) -> list[dict]:
        return list(self.cameras.values())

    def get_camera(self, camera_id: UUID) -> dict | None:
        return self.cameras.get(str(camera_id))

    def create_camera(self, payload: CameraCreate) -> dict:
        camera_id = str(uuid4())
        now = _utcnow().isoformat()
        row = {
            "id": camera_id,
            **payload.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        self.cameras[camera_id] = row
        return row

    def update_camera(self, camera_id: UUID, payload: CameraUpdate) -> dict | None:
        row = self.cameras.get(str(camera_id))
        if not row:
            return None
        row.update(payload.model_dump(exclude_none=True))
        row["updated_at"] = _utcnow().isoformat()
        return row

    def delete_camera(self, camera_id: UUID) -> bool:
        return self.cameras.pop(str(camera_id), None) is not None

    def list_zones(self, camera_id: UUID | None = None) -> list[dict]:
        values = list(self.zones.values())
        if camera_id is not None:
            values = [row for row in values if row["camera_id"] == str(camera_id)]
        return values

    def create_zone(self, payload: ZoneCreate) -> dict:
        zone_id = str(uuid4())
        row = {**payload.model_dump(mode="json"), "id": zone_id, "created_at": _utcnow().isoformat()}
        self.zones[zone_id] = row
        return row

    def update_zone(self, zone_id: UUID, payload: ZoneUpdate) -> dict | None:
        row = self.zones.get(str(zone_id))
        if not row:
            return None
        row.update(payload.model_dump(exclude_none=True, mode="json"))
        return row

    def delete_zone(self, zone_id: UUID) -> bool:
        return self.zones.pop(str(zone_id), None) is not None

    def list_events(self, filters: dict[str, Any], limit: int, offset: int) -> tuple[list[dict], int]:
        rows = list(self.events.values())
        if filters.get("camera_id"):
            rows = [row for row in rows if row["camera_id"] == str(filters["camera_id"])]
        if filters.get("event_type"):
            rows = [row for row in rows if row["event_type"] == filters["event_type"]]
        if filters.get("start_at"):
            start_iso = filters["start_at"].isoformat()
            rows = [row for row in rows if row["timestamp"] >= start_iso]
        if filters.get("end_at"):
            end_iso = filters["end_at"].isoformat()
            rows = [row for row in rows if row["timestamp"] <= end_iso]
        total = len(rows)
        rows = sorted(rows, key=lambda item: item["timestamp"], reverse=True)
        return rows[offset : offset + limit], total

    def get_event(self, event_id: UUID) -> dict | None:
        return self.events.get(str(event_id))

    def create_event(self, payload: dict[str, Any]) -> dict:
        event_id = str(uuid4())
        row = {**payload, "id": event_id}
        self.events[event_id] = row
        return row

    def create_risk_score(self, payload: dict[str, Any]) -> dict:
        score_id = str(uuid4())
        row = {**payload, "id": score_id}
        self.risk_scores[score_id] = row
        return row

    def create_alert(self, payload: dict[str, Any]) -> dict:
        alert_id = str(uuid4())
        row = {**payload, "id": alert_id, "created_at": _utcnow().isoformat()}
        self.alerts[alert_id] = row
        return row

    def list_alerts(self, filters: dict[str, Any], limit: int, offset: int) -> tuple[list[dict], int]:
        rows = list(self.alerts.values())
        for key in ("camera_id", "severity", "status"):
            if filters.get(key):
                target = str(filters[key]) if key == "camera_id" else filters[key]
                rows = [row for row in rows if row.get(key) == target]
        if filters.get("start_at"):
            start_iso = filters["start_at"].isoformat()
            rows = [row for row in rows if row["created_at"] >= start_iso]
        if filters.get("end_at"):
            end_iso = filters["end_at"].isoformat()
            rows = [row for row in rows if row["created_at"] <= end_iso]
        total = len(rows)
        rows = sorted(rows, key=lambda item: item["created_at"], reverse=True)
        return rows[offset : offset + limit], total

    def get_alert(self, alert_id: UUID) -> dict | None:
        return self.alerts.get(str(alert_id))

    def update_alert_status(self, alert_id: UUID, status_update: AlertStatusUpdate, user_id: UUID | None) -> dict | None:
        row = self.alerts.get(str(alert_id))
        if not row:
            return None
        row["status"] = status_update.status
        if status_update.status == "ACKNOWLEDGED":
            row["acknowledged_at"] = _utcnow().isoformat()
            row["acknowledged_by"] = str(user_id) if user_id else None
        return row

    def create_evidence(self, payload: EvidenceInput) -> dict:
        evidence_id = str(uuid4())
        row = payload.model_dump(mode="json")
        row["id"] = evidence_id
        row["snapshot_url"] = row.pop("snapshot_ref", None)
        row["video_clip_url"] = row.pop("video_clip_ref", None)
        row["created_at"] = _utcnow().isoformat()
        self.evidence[evidence_id] = row
        return row

    def get_evidence_for_alert(self, alert_id: UUID) -> list[dict]:
        return [row for row in self.evidence.values() if row["alert_id"] == str(alert_id)]

    def analytics_summary(self) -> dict[str, Any]:
        alerts = list(self.alerts.values())
        total = len(alerts)
        by_severity: dict[str, int] = defaultdict(int)
        by_camera: dict[str, int] = defaultdict(int)
        risk_sum = 0.0
        for row in alerts:
            by_severity[row.get("severity", "UNKNOWN")] += 1
            by_camera[row.get("camera_id", "unknown")] += 1
            risk_sum += float(row.get("risk_score") or 0.0)
        active = sorted(by_camera.items(), key=lambda item: item[1], reverse=True)[:5]
        return {
            "total_alerts": total,
            "avg_risk_score": round(risk_sum / total, 2) if total else 0.0,
            "alerts_by_severity": dict(by_severity),
            "most_active_cameras": [{"camera_id": camera_id, "count": count} for camera_id, count in active],
        }

    def analytics_alerts(self) -> dict[str, Any]:
        alerts = list(self.alerts.values())
        by_camera: dict[str, int] = defaultdict(int)
        over_time: dict[str, int] = defaultdict(int)
        for row in alerts:
            by_camera[row["camera_id"]] += 1
            date_key = str(row["created_at"])[:10]
            over_time[date_key] += 1
        return {
            "alerts_by_camera": [{"camera_id": cam, "count": count} for cam, count in by_camera.items()],
            "alerts_over_time": [{"date": date_key, "count": count} for date_key, count in sorted(over_time.items())],
            "recent_incidents": sorted(alerts, key=lambda r: r["created_at"], reverse=True)[:10],
        }

    def analytics_risk(self) -> dict[str, Any]:
        risk_rows = list(self.risk_scores.values())
        events = list(self.events.values())
        event_map = {row["id"]: row["event_type"] for row in events}
        by_severity: dict[str, int] = defaultdict(int)
        by_event: dict[str, int] = defaultdict(int)
        total = 0.0
        for row in risk_rows:
            by_severity[row.get("severity", "UNKNOWN")] += 1
            event_id = row.get("event_id")
            if event_id in event_map:
                by_event[event_map[event_id]] += 1
            total += float(row.get("score") or 0.0)
        count = len(risk_rows)
        return {
            "average_risk_score": round(total / count, 2) if count else 0.0,
            "risk_distribution": dict(by_severity),
            "event_type_counts": dict(by_event),
        }


_MEMORY_REPOSITORY = InMemoryRepository()


def get_repository() -> BaseRepository:
    if settings.supabase_ready:
        return SupabaseRepository()
    return _MEMORY_REPOSITORY
