from fastapi import APIRouter

from backend.app.services import alert_service, camera_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def summary() -> dict:
    cameras = camera_service.list_cameras()
    alerts = alert_service.list_alerts()
    by_severity = {"high": 0, "medium": 0, "low": 0}
    for alert in alerts:
        by_severity[alert.severity] = by_severity.get(alert.severity, 0) + 1
    return {
        "cameras_online": sum(1 for camera in cameras if camera.status == "online"),
        "cameras_total": len(cameras),
        "alerts_open": sum(1 for alert in alerts if alert.status == "open"),
        "alerts_by_severity": by_severity,
    }
