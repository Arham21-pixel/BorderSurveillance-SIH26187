from uuid import UUID

from backend.core.errors import AppError
from backend.schemas.alert import AlertFilter, AlertOut, AlertStatusUpdate
from backend.schemas.common import PaginatedResponse
from backend.services.repository import BaseRepository
from backend.services.websocket_manager import alert_ws_manager


class AlertService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    def list_alerts(self, filters: AlertFilter, limit: int, offset: int) -> PaginatedResponse[AlertOut]:
        rows, total = self.repo.list_alerts(filters.model_dump(exclude_none=True), limit, offset)
        items = [AlertOut.model_validate(row) for row in rows]
        return PaginatedResponse[AlertOut](items=items, limit=limit, offset=offset, total=total)

    def get_alert(self, alert_id: UUID) -> AlertOut:
        row = self.repo.get_alert(alert_id)
        if row is None:
            raise AppError("Alert not found.", "not_found", 404)
        return AlertOut.model_validate(row)

    async def acknowledge_alert(self, alert_id: UUID, user_id: UUID | None) -> AlertOut:
        update = AlertStatusUpdate(status="ACKNOWLEDGED")
        row = self.repo.update_alert_status(alert_id, update, user_id)
        if row is None:
            raise AppError("Alert not found.", "not_found", 404)
        alert = AlertOut.model_validate(row)
        await alert_ws_manager.broadcast(
            {
                "type": "alert_status_changed",
                "data": {
                    "alert_id": str(alert.id),
                    "status": alert.status,
                    "acknowledged_by": str(alert.acknowledged_by) if alert.acknowledged_by else None,
                    "timestamp": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                },
            }
        )
        return alert

    async def update_status(self, alert_id: UUID, status_update: AlertStatusUpdate, user_id: UUID | None) -> AlertOut:
        row = self.repo.update_alert_status(alert_id, status_update, user_id)
        if row is None:
            raise AppError("Alert not found.", "not_found", 404)
        alert = AlertOut.model_validate(row)
        await alert_ws_manager.broadcast(
            {
                "type": "alert_status_changed",
                "data": {
                    "alert_id": str(alert.id),
                    "status": alert.status,
                    "timestamp": alert.acknowledged_at.isoformat() if alert.acknowledged_at else alert.created_at.isoformat(),
                },
            }
        )
        return alert
