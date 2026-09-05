from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from backend.core.config import settings
from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.alert import AlertFilter, AlertOut, AlertStatusUpdate
from backend.schemas.common import PaginatedResponse
from backend.schemas.user import UserContext
from backend.services.alert_service import AlertService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _service(repo: BaseRepository = Depends(get_repo)) -> AlertService:
    return AlertService(repo)


@router.get("", response_model=PaginatedResponse[AlertOut])
def list_alerts(
    camera_id: UUID | None = Query(default=None),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
    limit: int = Query(default=settings.pagination_limit_default, ge=1, le=settings.pagination_limit_max),
    offset: int = Query(default=0, ge=0),
    service: AlertService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> PaginatedResponse[AlertOut]:
    filters = AlertFilter(
        camera_id=camera_id,
        severity=severity,
        status=status,
        start_at=start_at,
        end_at=end_at,
    )
    return service.list_alerts(filters=filters, limit=limit, offset=offset)


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(
    alert_id: UUID,
    service: AlertService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> AlertOut:
    return service.get_alert(alert_id)


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: UUID,
    service: AlertService = Depends(_service),
    user: UserContext = Depends(get_current_user),
) -> AlertOut:
    user_uuid = UUID(user.id) if _is_uuid(user.id) else None
    return await service.acknowledge_alert(alert_id=alert_id, user_id=user_uuid)


@router.patch("/{alert_id}/status", response_model=AlertOut)
async def update_alert_status(
    alert_id: UUID,
    payload: AlertStatusUpdate,
    service: AlertService = Depends(_service),
    user: UserContext = Depends(get_current_user),
) -> AlertOut:
    user_uuid = UUID(user.id) if _is_uuid(user.id) else None
    return await service.update_status(alert_id=alert_id, status_update=payload, user_id=user_uuid)


def _is_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except ValueError:
        return False
