from uuid import UUID

from backend.schemas.evidence import EvidenceInput, EvidenceOut
from backend.services.repository import BaseRepository


class EvidenceService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    def save_evidence(self, payload: EvidenceInput) -> EvidenceOut:
        return EvidenceOut.model_validate(self.repo.create_evidence(payload))

    def get_by_alert(self, alert_id: UUID) -> list[EvidenceOut]:
        rows = self.repo.get_evidence_for_alert(alert_id)
        return [EvidenceOut.model_validate(row) for row in rows]
