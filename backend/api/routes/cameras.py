from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.camera import CameraCreate, CameraOut, CameraUpdate
from backend.schemas.user import UserContext
from backend.services.camera_service import CameraService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


def _service(repo: BaseRepository = Depends(get_repo)) -> CameraService:
    return CameraService(repo)


@router.get("", response_model=list[CameraOut])
def list_cameras(
    service: CameraService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> list[CameraOut]:
    return service.list_cameras()


@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(
    camera_id: UUID,
    service: CameraService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> CameraOut:
    return service.get_camera(camera_id)


@router.post("", response_model=CameraOut, status_code=status.HTTP_201_CREATED)
def create_camera(
    payload: CameraCreate,
    service: CameraService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> CameraOut:
    return service.create_camera(payload)


@router.patch("/{camera_id}", response_model=CameraOut)
def update_camera(
    camera_id: UUID,
    payload: CameraUpdate,
    service: CameraService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> CameraOut:
    return service.update_camera(camera_id, payload)


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(
    camera_id: UUID,
    service: CameraService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> Response:
    service.delete_camera(camera_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
