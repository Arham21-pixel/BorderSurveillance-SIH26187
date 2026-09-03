from uuid import UUID

from backend.core.errors import AppError
from backend.schemas.zone import ZoneCreate, ZoneOut, ZoneUpdate
from backend.services.repository import BaseRepository


class ZoneService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    @staticmethod
    def _normalize_polygon(row: dict) -> dict:
        polygon = row.get("polygon") or []
        normalized: list[tuple[float, float]] = []
        for point in polygon:
            if isinstance(point, dict):
                normalized.append((float(point["x"]), float(point["y"])))
            else:
                normalized.append((float(point[0]), float(point[1])))
        return {**row, "polygon": normalized}

    def list_zones(self, camera_id: UUID | None = None) -> list[ZoneOut]:
        rows = [self._normalize_polygon(item) for item in self.repo.list_zones(camera_id)]
        return [ZoneOut.model_validate(item) for item in rows]

    def create_zone(self, payload: ZoneCreate) -> ZoneOut:
        if len(payload.polygon) < 3:
            raise AppError("Zone polygon must contain at least 3 points.", "validation_error", 422)
        row = self._normalize_polygon(self.repo.create_zone(payload))
        return ZoneOut.model_validate(row)

    def update_zone(self, zone_id: UUID, payload: ZoneUpdate) -> ZoneOut:
        if payload.polygon is not None and len(payload.polygon) < 3:
            raise AppError("Zone polygon must contain at least 3 points.", "validation_error", 422)
        row = self.repo.update_zone(zone_id, payload)
        if row is None:
            raise AppError("Zone not found.", "not_found", 404)
        return ZoneOut.model_validate(self._normalize_polygon(row))

    def delete_zone(self, zone_id: UUID) -> None:
        deleted = self.repo.delete_zone(zone_id)
        if not deleted:
            raise AppError("Zone not found.", "not_found", 404)
