"""
vision/pipeline/serializer.py

Converts internal vision types → the standardised Backend Integration Contract.

The backend/intelligence team consumes plain Python dicts (JSON-serialisable).
This module is the ONLY place where internal types are converted to that format.

Contract schema (see vision/integration_contract.py for full documentation):

    {
        "camera_id": str,
        "timestamp": str,          # ISO-8601 UTC
        "frame_id": int,
        "objects": [
            {
                "track_id": str,
                "object_class": str,       # generic: "person" | "vehicle" | "animal" | "other"
                "confidence": float,
                "bounding_box": [x1, y1, x2, y2],
                "trajectory": [[cx, cy], ...]
            }
        ]
    }
"""
from __future__ import annotations

from vision.tracking.result import TrackingResult


def tracking_results_to_contract(
    camera_id: str,
    timestamp: str,
    frame_id: int,
    tracked_objects: list[TrackingResult],
) -> dict:
    """Convert a list of TrackingResult objects into the backend contract dict.

    Parameters
    ----------
    camera_id:
        Source camera identifier.
    timestamp:
        ISO-8601 UTC timestamp of the frame.
    frame_id:
        Sequential frame index.
    tracked_objects:
        List of TrackingResult objects from the current frame.

    Returns
    -------
    dict
        JSON-serialisable dict matching the integration contract schema.
    """
    objects = []
    for tr in tracked_objects:
        objects.append({
            "track_id": tr.track_id,
            "object_class": tr.object_class,
            "confidence": round(tr.confidence, 4),
            "bounding_box": [round(v, 2) for v in tr.bounding_box],
            "trajectory": [[round(cx, 2), round(cy, 2)] for cx, cy in tr.trajectory],
            "movement_direction": tr.movement_direction,
            "first_seen": tr.first_seen,
            "last_seen": tr.last_seen,
        })

    return {
        "camera_id": camera_id,
        "timestamp": timestamp,
        "frame_id": frame_id,
        "objects": objects,
    }


def contract_to_tracking_results(contract: dict) -> list[TrackingResult]:
    """Deserialise a backend contract dict back into TrackingResult objects.

    Useful for the intelligence layer when re-consuming stored contract data.
    """
    camera_id = str(contract.get("camera_id", ""))
    timestamp = str(contract.get("timestamp", ""))

    results = []
    for obj in contract.get("objects", []):
        results.append(
            TrackingResult(
                track_id=str(obj["track_id"]),
                object_class=str(obj["object_class"]),
                confidence=float(obj["confidence"]),
                bounding_box=list(obj["bounding_box"]),
                timestamp=timestamp,
                camera_id=camera_id,
                trajectory=[tuple(pt) for pt in obj.get("trajectory", [])],
                movement_direction=obj.get("movement_direction"),
                first_seen=str(obj.get("first_seen", "")),
                last_seen=str(obj.get("last_seen", "")),
            )
        )
    return results
