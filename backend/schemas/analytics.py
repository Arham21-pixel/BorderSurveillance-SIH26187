from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_alerts: int
    avg_risk_score: float
    alerts_by_severity: dict[str, int]
    most_active_cameras: list[dict]


class AlertsAnalytics(BaseModel):
    alerts_by_camera: list[dict]
    alerts_over_time: list[dict]
    recent_incidents: list[dict]


class RiskAnalytics(BaseModel):
    average_risk_score: float
    risk_distribution: dict[str, int]
    event_type_counts: dict[str, int]
