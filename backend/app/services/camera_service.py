from uuid import uuid4

from backend.app.schemas.camera import CameraCreate, CameraRead, CameraUpdate

_CAMERAS: dict[str, CameraRead] = {}



def list_cameras() -> list[CameraRead]:
    return list(_CAMERAS.values())


def get_camera(camera_id: str) -> CameraRead | None:
    return _CAMERAS.get(camera_id)


def create_camera(payload: CameraCreate) -> CameraRead:
    camera = CameraRead(id=f"cam-{uuid4().hex[:8]}", status="offline", **payload.model_dump())
    _CAMERAS[camera.id] = camera
    return camera


def update_camera(camera_id: str, payload: CameraUpdate) -> CameraRead | None:
    current = _CAMERAS.get(camera_id)
    if current is None:
        return None
    updated = current.model_copy(update=payload.model_dump(exclude_none=True))
    _CAMERAS[camera_id] = updated
    return updated


def get_status(camera_id: str) -> dict | None:
    camera = get_camera(camera_id)
    if camera is None:
        return None
    return {"id": camera.id, "status": camera.status, "last_seen": camera.last_seen}
