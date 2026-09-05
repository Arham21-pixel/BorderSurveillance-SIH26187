"""
vision — BORDER AI SENTINEL computer vision package.

Lightweight top-level init — only pure-Python, no-dependency modules.
Heavy sub-packages (cv_pipeline, ingestion, preprocessing) must be imported
directly from their sub-packages to avoid pulling in OpenCV/torch at import time.

Quick start:
    from vision.pipeline.cv_pipeline import CVPipeline
    from vision.pipeline.config import VisionConfig
    from vision.ingestion.video_source import open_source
"""

from vision.detection.result import DetectionResult
from vision.integration_contract import validate_contract
from vision.tracking.result import TrackingResult

__version__ = "0.1.0"

__all__ = [
    "DetectionResult",
    "TrackingResult",
    "validate_contract",
]
