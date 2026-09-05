"""AI pipeline integration routes."""

from uuid import UUID

from fastapi import APIRouter, Depends

from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.evidence import EvidenceInput, EvidenceOut
from backend.schemas.ingest import DetectionBatchInput, DetectionInput, PipelineBatchResult, PipelineItemResult
from backend.schemas.user import UserContext
from backend.services.ingest_service import IngestService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


def _service(repo: BaseRepository = Depends(get_repo)) -> IngestService:
    return IngestService(repo)


@router.post("/detection", response_model=PipelineItemResult)
async def ingest_detection(
    payload: DetectionInput,
    service: IngestService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> PipelineItemResult:
    return await service.process_detection(payload)


@router.post("/detections", response_model=PipelineBatchResult)
async def ingest_detections(
    payload: DetectionBatchInput,
    service: IngestService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> PipelineBatchResult:
    return await service.process_batch(payload)


@router.post("/evidence", response_model=EvidenceOut)
def ingest_evidence(
    payload: EvidenceInput,
    service: IngestService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> EvidenceOut:
    row = service.save_evidence_metadata(payload)
    return EvidenceOut.model_validate(row)


@router.post("/demo/{camera_id}", response_model=PipelineItemResult)
async def demo_pipeline(
    camera_id: UUID,
    service: IngestService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> PipelineItemResult:
    return await service.demo_inject_detection(camera_id)
