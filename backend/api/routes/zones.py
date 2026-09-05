from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.user import UserContext
from backend.schemas.zone import ZoneCreate, ZoneOut, ZoneUpdate
from backend.services.repository import BaseRepository
from backend.services.zone_service import ZoneService

router = APIRouter(prefix="/api/zones", tags=["zones"])


def _service(repo: BaseRepository = Depends(get_repo)) -> ZoneService:
    return ZoneService(repo)


@router.get("", response_model=list[ZoneOut])
def list_zones(
    camera_id: UUID | None = Query(default=None),
    service: ZoneService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> list[ZoneOut]:
    return service.list_zones(camera_id=camera_id)


@router.post("", response_model=ZoneOut, status_code=status.HTTP_201_CREATED)
def create_zone(
    payload: ZoneCreate,
    service: ZoneService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> ZoneOut:
    return service.create_zone(payload)


@router.patch("/{zone_id}", response_model=ZoneOut)
def update_zone(
    zone_id: UUID,
    payload: ZoneUpdate,
    service: ZoneService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> ZoneOut:
    return service.update_zone(zone_id, payload)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: UUID,
    service: ZoneService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> Response:
    service.delete_zone(zone_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
