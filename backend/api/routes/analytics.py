from fastapi import APIRouter, Depends

from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.analytics import AlertsAnalytics, AnalyticsSummary, RiskAnalytics
from backend.schemas.user import UserContext
from backend.services.analytics_service import AnalyticsService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _service(repo: BaseRepository = Depends(get_repo)) -> AnalyticsService:
    return AnalyticsService(repo)


@router.get("/summary", response_model=AnalyticsSummary)
def summary(
    service: AnalyticsService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> AnalyticsSummary:
    return service.summary()


@router.get("/alerts", response_model=AlertsAnalytics)
def alerts(
    service: AnalyticsService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> AlertsAnalytics:
    return service.alerts()


@router.get("/risk", response_model=RiskAnalytics)
def risk(
    service: AnalyticsService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> RiskAnalytics:
    return service.risk()
