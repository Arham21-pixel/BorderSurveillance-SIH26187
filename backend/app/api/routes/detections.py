from fastapi import APIRouter, File, UploadFile

from backend.app.schemas.detection import DetectionResult
from backend.app.services import detection_service

router = APIRouter(prefix="/detections", tags=["detections"])


@router.get("", response_model=list[DetectionResult])
def list_detections(limit: int = 50) -> list[DetectionResult]:
    return detection_service.recent(limit=limit)


@router.get("/{camera_id}", response_model=list[DetectionResult])
def detections_for_camera(camera_id: str, limit: int = 50) -> list[DetectionResult]:
    return detection_service.for_camera(camera_id, limit=limit)


@router.post("/infer", response_model=DetectionResult)
async def infer_frame(camera_id: str = "upload", file: UploadFile = File(...)) -> DetectionResult:
    payload = await file.read()
    return detection_service.infer_bytes(camera_id, payload)
