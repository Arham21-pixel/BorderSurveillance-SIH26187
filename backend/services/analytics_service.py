from backend.schemas.analytics import AlertsAnalytics, AnalyticsSummary, RiskAnalytics
from backend.services.repository import BaseRepository


class AnalyticsService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    def summary(self) -> AnalyticsSummary:
        return AnalyticsSummary.model_validate(self.repo.analytics_summary())

    def alerts(self) -> AlertsAnalytics:
        return AlertsAnalytics.model_validate(self.repo.analytics_alerts())

    def risk(self) -> RiskAnalytics:
        return RiskAnalytics.model_validate(self.repo.analytics_risk())
