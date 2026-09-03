from uuid import UUID

from backend.core.errors import AppError
from backend.schemas.camera import CameraCreate, CameraOut, CameraUpdate
from backend.services.repository import BaseRepository


class CameraService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    def list_cameras(self) -> list[CameraOut]:
        return [CameraOut.model_validate(item) for item in self.repo.list_cameras()]

    def get_camera(self, camera_id: UUID) -> CameraOut:
        item = self.repo.get_camera(camera_id)
        if item is None:
            raise AppError("Camera not found.", "not_found", 404)
        return CameraOut.model_validate(item)

    def create_camera(self, payload: CameraCreate) -> CameraOut:
        return CameraOut.model_validate(self.repo.create_camera(payload))

    def update_camera(self, camera_id: UUID, payload: CameraUpdate) -> CameraOut:
        item = self.repo.update_camera(camera_id, payload)
        if item is None:
            raise AppError("Camera not found.", "not_found", 404)
        return CameraOut.model_validate(item)

    def delete_camera(self, camera_id: UUID) -> None:
        deleted = self.repo.delete_camera(camera_id)
        if not deleted:
            raise AppError("Camera not found.", "not_found", 404)
