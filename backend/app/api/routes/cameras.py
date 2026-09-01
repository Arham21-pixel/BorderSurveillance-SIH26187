from fastapi import APIRouter, HTTPException

from backend.app.schemas.camera import CameraCreate, CameraRead, CameraUpdate
from backend.app.services import camera_service

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("", response_model=list[CameraRead])
def list_cameras() -> list[CameraRead]:
    return camera_service.list_cameras()


@router.get("/{camera_id}", response_model=CameraRead)
def get_camera(camera_id: str) -> CameraRead:
    camera = camera_service.get_camera(camera_id)
    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.post("", response_model=CameraRead, status_code=201)
def create_camera(payload: CameraCreate) -> CameraRead:
    return camera_service.create_camera(payload)


@router.patch("/{camera_id}", response_model=CameraRead)
def update_camera(camera_id: str, payload: CameraUpdate) -> CameraRead:
    camera = camera_service.update_camera(camera_id, payload)
    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.get("/{camera_id}/status")
def camera_status(camera_id: str) -> dict:
    status = camera_service.get_status(camera_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return status
