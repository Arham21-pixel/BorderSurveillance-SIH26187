"""
vision/pipeline/cv_pipeline.py

CVPipeline — the top-level orchestrator for the BORDER AI SENTINEL vision stack.

Complete data flow:
    Video Source → FrameData
    → PreprocessingPipeline  (resize, low-light)
    → Detector               (YOLO — returns DetectionResult list)
    → TrackManager           (ByteTrack-style — returns TrackingResult list)
    → Serializer             (returns backend integration contract dict)

Usage
-----
    from vision.pipeline.config import VisionConfig, lightweight_cpu_config
    from vision.pipeline.cv_pipeline import CVPipeline
    from vision.ingestion import open_source

    config = lightweight_cpu_config()
    pipeline = CVPipeline(config)

    with open_source("data/sample.mp4", camera_id="cam-01") as src:
        for frame_data in src.frames(sample_every=config.sample_every):
            contract = pipeline.process_frame_data(frame_data)
            print(contract)

Or for ad-hoc use without a VideoSource:

    import cv2
    frame = cv2.imread("test.jpg")
    detections, tracks = pipeline.process_frame(
        frame,
        metadata={"camera_id": "cam-01", "frame_id": 0, "timestamp": "2026-01-01T00:00:00Z"}
    )
"""
from __future__ import annotations

import datetime
import logging
from typing import Optional

import numpy as np

from vision.detection.detector import Detector
from vision.detection.result import DetectionResult
from vision.pipeline.config import VisionConfig
from vision.pipeline.serializer import tracking_results_to_contract
from vision.preprocessing.enhancement import PreprocessingPipeline
from vision.tracking.result import TrackingResult
from vision.tracking.track_manager import TrackManager
from vision.utils.logging_config import get_logger


class CVPipeline:
    """Complete CV pipeline: ingestion → preprocessing → detection → tracking.

    This class is the primary integration point for the backend/intelligence
    layer.  It does NOT import FastAPI, Supabase, or any backend modules.

    Parameters
    ----------
    config:
        A :class:`VisionConfig` instance controlling all pipeline parameters.
        Defaults to a CPU-friendly balanced configuration.
    """

    def __init__(self, config: Optional[VisionConfig] = None) -> None:
        self.config = config or VisionConfig()
        self.config.validate()

        # Initialise logger at the configured level
        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        self._logger = get_logger(__name__, level=log_level)
        self._logger.info("Initialising CVPipeline with config: %s", self.config)

        # ── Sub-components ────────────────────────────────────────────────────
        self._preprocessor = PreprocessingPipeline(
            width=self.config.preprocess_width,
            low_light=self.config.low_light,
            gamma=self.config.gamma,
        )

        self._detector = Detector(
            model_path=self.config.model_path,
            confidence=self.config.confidence,
            imgsz=self.config.imgsz,
            device=self.config.device,
        )

        self._track_manager = TrackManager(
            max_age=self.config.tracker_max_age,
            iou_threshold_high=self.config.tracker_iou_high,
            iou_threshold_low=self.config.tracker_iou_low,
            high_conf_threshold=self.config.tracker_high_conf,
        )

        self._frame_counter: dict[str, int] = {}  # per camera frame counter

    # ── Primary API ───────────────────────────────────────────────────────────

    def process_frame(
        self,
        frame: np.ndarray,
        metadata: dict,
    ) -> tuple[list[DetectionResult], list[TrackingResult]]:
        """Process a single raw frame with explicit metadata.

        This is the low-level interface.  Use :meth:`process_frame_data` when
        working with a VideoSource.

        Parameters
        ----------
        frame:
            BGR numpy array (OpenCV format).
        metadata:
            Dict with keys:
            - ``camera_id`` (str, required)
            - ``frame_id`` (int, optional — auto-increments per camera)
            - ``timestamp`` (str ISO-8601, optional — auto-generated)

        Returns
        -------
        (detections, tracked_objects)
            ``detections`` is the raw YOLO output.
            ``tracked_objects`` is the tracker output with trajectory history.
        """
        camera_id: str = str(metadata.get("camera_id", "default"))
        timestamp: str = str(
            metadata.get("timestamp") or datetime.datetime.utcnow().isoformat() + "Z"
        )

        # Per-camera frame counter
        self._frame_counter.setdefault(camera_id, 0)
        frame_id: int = int(metadata.get("frame_id", self._frame_counter[camera_id]))
        self._frame_counter[camera_id] += 1

        # ── Step 1: Validate frame ────────────────────────────────────────
        if frame is None or (hasattr(frame, 'size') and frame.size == 0):
            self._logger.warning(
                "Empty frame received (camera=%s frame_id=%d) — skipping.",
                camera_id, frame_id,
            )
            return [], []

        # ── Step 2: Preprocessing ─────────────────────────────────────────
        try:
            processed = self._preprocessor.apply(frame)
        except Exception as exc:
            self._logger.error(
                "Preprocessing error (camera=%s frame_id=%d): %s",
                camera_id, frame_id, exc,
            )
            processed = frame

        # ── Step 3: YOLO Detection ────────────────────────────────────────
        try:
            detections = self._detector.detect(
                processed,
                frame_id=frame_id,
                camera_id=camera_id,
                timestamp=timestamp,
            )
        except Exception as exc:
            self._logger.error(
                "Inference error (camera=%s frame_id=%d): %s",
                camera_id, frame_id, exc,
            )
            detections = []

        # ── Step 4: ByteTrack-style Tracking ──────────────────────────────
        try:
            tracked = self._track_manager.update(
                camera_id=camera_id,
                detections=detections,
                timestamp=timestamp,
            )
        except Exception as exc:
            self._logger.error(
                "Tracking error (camera=%s frame_id=%d): %s",
                camera_id, frame_id, exc,
            )
            tracked = []

        self._logger.debug(
            "camera=%s frame_id=%d → %d detections, %d tracks",
            camera_id, frame_id, len(detections), len(tracked),
        )
        return detections, tracked

    def process_frame_data(self, frame_data) -> dict:
        """Process a :class:`~vision.ingestion.FrameData` and return the
        backend integration contract dict.

        This is the recommended high-level interface when using a VideoSource.

        Parameters
        ----------
        frame_data:
            A ``FrameData`` object from a VideoSource.

        Returns
        -------
        dict
            Integration contract dict (JSON-serialisable).
        """
        metadata = {
            "camera_id": frame_data.camera_id,
            "frame_id": frame_data.frame_index,
            "timestamp": frame_data.timestamp,
        }
        detections, tracked = self.process_frame(frame_data.frame, metadata=metadata)
        return tracking_results_to_contract(
            camera_id=frame_data.camera_id,
            timestamp=frame_data.timestamp,
            frame_id=frame_data.frame_index,
            tracked_objects=tracked,
        )

    # ── Source management ─────────────────────────────────────────────────────

    def reset_camera(self, camera_id: str) -> None:
        """Reset tracking state for a specific camera (e.g. after stream restart)."""
        self._track_manager.reset(camera_id)
        self._frame_counter.pop(camera_id, None)
        self._logger.info("CVPipeline: reset camera '%s'", camera_id)

    def reset_all(self) -> None:
        """Reset all camera tracking state."""
        self._track_manager.reset_all()
        self._frame_counter.clear()
        self._logger.info("CVPipeline: all cameras reset.")

    # ── Status ────────────────────────────────────────────────────────────────

    def is_ready(self) -> bool:
        """Return True if the detector model is loaded and ready."""
        return self._detector.is_ready()

    def active_cameras(self) -> list[str]:
        """Return list of camera IDs with active tracking sessions."""
        return self._track_manager.active_cameras()

    def track_count(self, camera_id: str) -> int:
        """Return number of active tracks for a camera."""
        return self._track_manager.track_count(camera_id)

    def __repr__(self) -> str:
        return (
            f"CVPipeline(ready={self.is_ready()}, "
            f"device={self.config.device}, "
            f"cameras={self.active_cameras()})"
        )
