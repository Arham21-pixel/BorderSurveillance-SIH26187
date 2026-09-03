from uuid import UUID

from backend.core.errors import AppError
from backend.schemas.zone import ZoneCreate, ZoneOut, ZoneUpdate
from backend.services.repository import BaseRepository


class ZoneService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    def list_zones(self, camera_id: UUID | None = None) -> list[ZoneOut]:
        return [ZoneOut.model_validate(item) for item in self.repo.list_zones(camera_id)]

    def create_zone(self, payload: ZoneCreate) -> ZoneOut:
        if len(payload.polygon) < 3:
            raise AppError("Zone polygon must contain at least 3 points.", "validation_error", 422)
        return ZoneOut.model_validate(self.repo.create_zone(payload))

    def update_zone(self, zone_id: UUID, payload: ZoneUpdate) -> ZoneOut:
        if payload.polygon is not None and len(payload.polygon) < 3:
            raise AppError("Zone polygon must contain at least 3 points.", "validation_error", 422)
        row = self.repo.update_zone(zone_id, payload)
        if row is None:
            raise AppError("Zone not found.", "not_found", 404)
        return ZoneOut.model_validate(row)

    def delete_zone(self, zone_id: UUID) -> None:
        deleted = self.repo.delete_zone(zone_id)
        if not deleted:
            raise AppError("Zone not found.", "not_found", 404)
