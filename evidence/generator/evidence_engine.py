"""
evidence/generator/evidence_engine.py

EvidenceEngine — orchestrates all evidence artifact generators.

Input:
    - frame (numpy array)
    - event timestamp
    - camera_id
    - alert/event_id
    - tracking information (list of contract dicts)
    - optional rolling video buffer

Output:
    EvidencePackage dict containing local file paths for:
    - snapshot JPEG
    - short clip MP4 (if buffer provided)
    - trajectory map PNG
    - event metadata JSON

The backend receives this dict and uploads the files to Supabase Storage.
This module does NOT perform database writes or uploads.
"""
from __future__ import annotations

import datetime
import os
from pathlib import Path
from typing import Optional

import numpy as np

from evidence.generator.clip import RollingBuffer, flush_clip
from evidence.generator.metadata import write_metadata
from evidence.generator.snapshot import save_snapshot
from evidence.generator.trajectory_map import (
    draw_trajectory_on_frame,
    generate_trajectory_map,
)


class EvidenceEngine:
    """Generates all evidence artifacts for a detected event.

    Parameters
    ----------
    output_dir:
        Root directory where evidence folders are created.
        Sub-folders are organised as: ``<output_dir>/<event_id>/``
    clip_fps:
        Frame rate for video clip output.  Default: 12 FPS.
    snapshot_quality:
        JPEG quality for snapshots (1–100).  Default: 90.
    """

    def __init__(
        self,
        output_dir: str = "evidence/events",
        clip_fps: float = 12.0,
        snapshot_quality: int = 90,
    ) -> None:
        self.output_dir = Path(output_dir)
        self.clip_fps = clip_fps
        self.snapshot_quality = snapshot_quality

    def generate(
        self,
        frame: np.ndarray | None,
        event_id: str,
        camera_id: str,
        timestamp: str | None = None,
        tracked_objects: list[dict] | None = None,
        rolling_buffer: RollingBuffer | None = None,
        event_context: dict | None = None,
    ) -> dict:
        """Generate all evidence artifacts for one event.

        Parameters
        ----------
        frame:
            Current BGR frame at the moment of the event.
        event_id:
            Unique identifier for this alert/event (supplied by backend).
        camera_id:
            Source camera identifier.
        timestamp:
            ISO-8601 UTC timestamp; auto-generated if None.
        tracked_objects:
            List of tracked object dicts from the pipeline contract.
        rolling_buffer:
            If provided, a short clip is written from its contents.
        event_context:
            Free-form caller context (e.g. zone, alert type).

        Returns
        -------
        dict
            EvidencePackage with keys:
            ``event_id``, ``camera_id``, ``timestamp``,
            ``snapshot``, ``clip``, ``trajectory_map``, ``metadata``.
            All file path values are absolute strings or None.
        """
        if timestamp is None:
            timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        tracked_objects = tracked_objects or []
        event_dir = self.output_dir / event_id
        event_dir.mkdir(parents=True, exist_ok=True)

        # ── Snapshot ──────────────────────────────────────────────────────────
        snapshot_path: str | None = None
        if frame is not None:
            snapshot_path = save_snapshot(
                frame=frame,
                output_path=str(event_dir / "snapshot.jpg"),
                tracked_objects=tracked_objects,
                quality=self.snapshot_quality,
            )

        # ── Video Clip ────────────────────────────────────────────────────────
        clip_path: str | None = None
        if rolling_buffer is not None and rolling_buffer.size > 0:
            clip_path = flush_clip(
                buffer=rolling_buffer,
                output_path=str(event_dir / "clip.mp4"),
                fps=self.clip_fps,
                clear_after=False,
            )

        # ── Trajectory Map ────────────────────────────────────────────────────
        traj_map_path: str | None = None
        trajectories = {
            obj["track_id"]: obj.get("trajectory", [])
            for obj in tracked_objects
            if obj.get("trajectory")
        }
        if trajectories:
            traj_img = generate_trajectory_map(trajectories)
            if frame is not None:
                traj_img = draw_trajectory_on_frame(
                    frame, next(iter(trajectories.values())),
                    track_id=next(iter(trajectories.keys())),
                )
            import cv2
            traj_path = str(event_dir / "trajectory_map.png")
            cv2.imwrite(traj_path, traj_img)
            traj_map_path = str(Path(traj_path).resolve())

        # ── Metadata JSON ─────────────────────────────────────────────────────
        metadata_path = write_metadata(
            output_path=str(event_dir / "metadata.json"),
            event_id=event_id,
            camera_id=camera_id,
            timestamp=timestamp,
            tracked_objects=tracked_objects,
            event_context=event_context,
            snapshot_path=snapshot_path,
            clip_path=clip_path,
            trajectory_map_path=traj_map_path,
        )

        return {
            "event_id": event_id,
            "camera_id": camera_id,
            "timestamp": timestamp,
            "snapshot": snapshot_path,
            "clip": clip_path,
            "trajectory_map": traj_map_path,
            "metadata": metadata_path,
        }
