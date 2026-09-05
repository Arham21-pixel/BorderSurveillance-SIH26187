from datetime import datetime, timezone
from uuid import UUID

from backend.schemas.evidence import EvidenceInput
from backend.schemas.ingest import DetectionBatchInput, DetectionInput, PipelineBatchResult, PipelineItemResult
from backend.services.repository import BaseRepository
from backend.services.websocket_manager import alert_ws_manager
from intelligence.engine.pipeline import IntelligencePipeline
class IngestService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo
        self.pipeline = IntelligencePipeline()

    async def process_detection(self, payload: DetectionInput) -> PipelineItemResult:
        zone_rows = self.repo.list_zones(payload.camera_id)
        pipeline_result = self.pipeline.process_detection(payload, zone_rows)
        timestamp_iso = payload.timestamp.isoformat()

        track_row = self.repo.upsert_track(
            {
                "camera_id": str(payload.camera_id),
                "external_track_id": payload.track_id,
                "object_class": payload.object_class,
                "start_time": timestamp_iso,
                "last_seen": timestamp_iso,
                "direction": pipeline_result.context.get("direction", "UNKNOWN"),
                "dwell_time": float(pipeline_result.context.get("dwell_time") or 0.0),
                "trajectory": [
                    {"x": point.x, "y": point.y, "t": point.t.isoformat() if point.t else None}
                    for point in payload.trajectory
                ],
            }
        )

        self.repo.create_detection(
            {
                "camera_id": str(payload.camera_id),
                "track_id": track_row["id"],
                "object_class": payload.object_class,
                "confidence": payload.confidence,
                "bounding_box": payload.bounding_box.model_dump(),
                "timestamp": timestamp_iso,
            }
        )

        event_row = self.repo.create_event(
            {
                "camera_id": str(payload.camera_id),
                "track_id": track_row["id"],
                "event_type": pipeline_result.event_type,
                "event_data": pipeline_result.context,
                "timestamp": timestamp_iso,
            }
        )

        risk_row = self.repo.create_risk_score(
            {
                "event_id": event_row["id"],
                "score": pipeline_result.risk_result.score,
                "severity": pipeline_result.risk_result.severity,
                "reasons": pipeline_result.risk_result.reasons,
                "contributing_factors": pipeline_result.risk_result.contributing_factors,
                "calculated_at": pipeline_result.risk_result.timestamp.isoformat(),
            }
        )

        # PRD-001 / TRD-001 v0.2: alerts are raised at SUSPICIOUS+ (score ≥ 30)
        alert_created = pipeline_result.risk_result.score >= 30
        if alert_created:
            alert_row = self.repo.create_alert(
                {
                    "event_id": event_row["id"],
                    "camera_id": str(payload.camera_id),
                    "risk_score": pipeline_result.risk_result.score,
                    "severity": pipeline_result.risk_result.severity,
                    "status": "OPEN",
                    "acknowledged_by": None,
                    "acknowledged_at": None,
                    "reasons": pipeline_result.risk_result.reasons,
                    "extra": {"event_type": pipeline_result.event_type},
                }
            )
            await alert_ws_manager.broadcast(
                {
                    "type": "new_alert",
                    "data": {
                        "alert_id": alert_row["id"],
                        "camera_id": alert_row["camera_id"],
                        "severity": alert_row["severity"],
                        "risk_score": alert_row["risk_score"],
                        "event_type": pipeline_result.event_type,
                        "timestamp": alert_row["created_at"],
                        "reasons": pipeline_result.risk_result.reasons,
                    },
                }
            )

        return PipelineItemResult(
            event_id=event_row["id"],
            camera_id=payload.camera_id,
            track_id=payload.track_id,
            event_type=pipeline_result.event_type,
            risk_score=float(risk_row["score"]),
            severity=risk_row["severity"],
            reasons=list(risk_row.get("reasons") or []),
            alert_created=alert_created,
            context=pipeline_result.context,
        )

    async def process_batch(self, payload: DetectionBatchInput) -> PipelineBatchResult:
        results: list[PipelineItemResult] = []
        for item in payload.detections:
            results.append(await self.process_detection(item))
        return PipelineBatchResult(results=results)

    def save_evidence_metadata(self, payload: EvidenceInput) -> dict:
        return self.repo.create_evidence(payload)

    async def demo_inject_detection(self, camera_id: UUID) -> PipelineItemResult:
        now = datetime.now(timezone.utc)
        demo = DetectionInput(
            camera_id=camera_id,
            timestamp=now,
            frame_id="demo-frame",
            track_id="demo-track-1",
            object_class="person",
            confidence=0.87,
            bounding_box={"x1": 110, "y1": 140, "x2": 180, "y2": 310},
            trajectory=[{"x": 100, "y": 120}, {"x": 120, "y": 140}, {"x": 138, "y": 162}],
            attributes={"night": True},
        )
        return await self.process_detection(demo)
