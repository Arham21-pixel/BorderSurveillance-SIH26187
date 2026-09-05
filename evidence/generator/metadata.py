"""
evidence/generator/metadata.py

Event metadata JSON generator.

Writes a structured JSON file describing an alert/event.
The backend uses this file to populate the database record before
uploading snapshot/clip references to Supabase Storage.

This module does NOT write to any database — it only writes to disk.
"""
from __future__ import annotations

import json
from pathlib import Path


def write_metadata(
    output_path: str,
    event_id: str,
    camera_id: str,
    timestamp: str,
    tracked_objects: list[dict],
    event_context: dict | None = None,
    snapshot_path: str | None = None,
    clip_path: str | None = None,
    trajectory_map_path: str | None = None,
) -> str:
    """Write event metadata to a JSON file.

    Parameters
    ----------
    output_path:
        Destination path for the JSON file (parent dirs created automatically).
    event_id:
        Unique alert/event identifier (supplied by the backend).
    camera_id:
        Source camera identifier.
    timestamp:
        ISO-8601 UTC timestamp of the triggering frame.
    tracked_objects:
        List of backend-contract object dicts for this event.
    event_context:
        Additional free-form dict provided by the caller
        (e.g. ``{"zone": "sector-4", "alert_type": "intrusion"}``).
    snapshot_path:
        Path to the generated snapshot file (if any).
    clip_path:
        Path to the generated clip file (if any).
    trajectory_map_path:
        Path to the trajectory map image (if any).

    Returns
    -------
    str
        Absolute path to the written JSON file.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    metadata = {
        "event_id": event_id,
        "camera_id": camera_id,
        "timestamp": timestamp,
        "objects": tracked_objects,
        "evidence": {
            "snapshot": snapshot_path,
            "clip": clip_path,
            "trajectory_map": trajectory_map_path,
        },
        "context": event_context or {},
    }

    path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return str(path.resolve())
