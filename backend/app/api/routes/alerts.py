from fastapi import APIRouter, HTTPException

from backend.app.schemas.alert import AlertRead
from backend.app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRead])
def list_alerts(severity: str | None = None, status: str | None = None) -> list[AlertRead]:
    return alert_service.list_alerts(severity=severity, status=status)


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert(alert_id: str) -> AlertRead:
    alert = alert_service.get_alert(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/ack", response_model=AlertRead)
def ack_alert(alert_id: str) -> AlertRead:
    alert = alert_service.acknowledge(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
