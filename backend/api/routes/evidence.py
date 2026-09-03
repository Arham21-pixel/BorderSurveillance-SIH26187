from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.evidence import EvidenceInput, EvidenceOut
from backend.schemas.user import UserContext
from backend.services.evidence_service import EvidenceService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


def _service(repo: BaseRepository = Depends(get_repo)) -> EvidenceService:
    return EvidenceService(repo)


@router.get("/{alert_id}", response_model=list[EvidenceOut])
def get_evidence(
    alert_id: UUID,
    service: EvidenceService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> list[EvidenceOut]:
    return service.get_by_alert(alert_id)


@router.post("", response_model=EvidenceOut)
def save_evidence(
    payload: EvidenceInput,
    service: EvidenceService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> EvidenceOut:
    return service.save_evidence(payload)
