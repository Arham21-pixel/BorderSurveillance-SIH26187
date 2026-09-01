from datetime import datetime, timezone
from uuid import uuid4

from backend.app.schemas.alert import AlertRead
from intelligence.risk_engine import severity_for

_ALERTS: list[AlertRead] = []


def _seed() -> None:
    if _ALERTS:
        return
    _ALERTS.append(
        AlertRead(
            id=str(uuid4()),
            camera_id="cam-north-01",
            event_id="seed-event",
            severity="high",
            title="Restricted zone entry",
            description="Person crossed the inner fence belt on North Fence 01.",
            status="open",
            evidence_path=None,
            timestamp=datetime.now(timezone.utc),
        )
    )


_seed()


def list_alerts(severity: str | None = None, status: str | None = None) -> list[AlertRead]:
    rows = _ALERTS
    if severity:
        rows = [row for row in rows if row.severity == severity]
    if status:
        rows = [row for row in rows if row.status == status]
    return list(reversed(rows))


def get_alert(alert_id: str) -> AlertRead | None:
    return next((row for row in _ALERTS if row.id == alert_id), None)


def raise_alert(camera_id: str, event_id: str, title: str, description: str, score: float, evidence_path: str | None = None) -> AlertRead:
    alert = AlertRead(
        id=str(uuid4()),
        camera_id=camera_id,
        event_id=event_id,
        severity=severity_for(score),
        title=title,
        description=description,
        status="open",
        evidence_path=evidence_path,
        timestamp=datetime.now(timezone.utc),
    )
    _ALERTS.append(alert)
    return alert


def acknowledge(alert_id: str) -> AlertRead | None:
    for index, alert in enumerate(_ALERTS):
        if alert.id == alert_id:
            updated = alert.model_copy(update={"status": "acknowledged"})
            _ALERTS[index] = updated
            return updated
    return None
