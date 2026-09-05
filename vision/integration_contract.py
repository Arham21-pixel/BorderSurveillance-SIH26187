"""
vision/integration_contract.py
===============================

BORDER AI SENTINEL — Backend Integration Contract
==================================================

This file is the authoritative documentation and reference implementation
for the data contract between the CV pipeline (Aaryan — vision/) and the
Backend / Intelligence layer (other team members).

The vision pipeline outputs a JSON-serialisable dict.
The backend/intelligence layer consumes it via a WebSocket, queue, or HTTP
endpoint — the pipeline itself does NOT know which transport is used.

──────────────────────────────────────────────────────────────────────────────
Contract Schema
──────────────────────────────────────────────────────────────────────────────

{
    "camera_id": "cam-border-01",          # str — source camera identifier
    "timestamp": "2026-09-03T21:00:00Z",   # str — ISO-8601 UTC frame timestamp
    "frame_id": 123,                        # int — sequential frame index
    "objects": [                            # list — one entry per tracked object
        {
            "track_id": "T0001",            # str — stable tracker ID
            "object_class": "person",       # str — generic class (see CLASSES below)
            "confidence": 0.91,             # float — YOLO detection confidence [0,1]
            "bounding_box": [x1, y1, x2, y2],  # list[float] — pixel coords
            "trajectory": [[cx, cy], ...],  # list[list[float]] — centroid history
            "movement_direction": "NE",     # str|null — cardinal direction or "stationary"
            "first_seen": "2026-09-03T21:00:00Z",  # str — ISO-8601 UTC
            "last_seen":  "2026-09-03T21:00:05Z"   # str — ISO-8601 UTC
        }
    ]
}

──────────────────────────────────────────────────────────────────────────────
Generic Object Classes
──────────────────────────────────────────────────────────────────────────────

The "object_class" field is always one of the following generic values.
The intelligence layer should use these — never rely on raw YOLO class IDs.

    "person"    — Any detected human.
    "vehicle"   — Any wheeled or motorised vehicle (car, truck, motorcycle, etc.)
    "animal"    — Any detected animal (horse, dog, bear, etc.)
    "other"     — Any detected object not in the above categories.

──────────────────────────────────────────────────────────────────────────────
movement_direction values
──────────────────────────────────────────────────────────────────────────────

    "N", "NE", "E", "SE", "S", "SW", "W", "NW" — Cardinal / intercardinal
    "stationary"                                  — Object barely moved
    null                                          — Insufficient trajectory data

──────────────────────────────────────────────────────────────────────────────
How to consume the contract
──────────────────────────────────────────────────────────────────────────────

    # Option A — receive from pipeline directly
    from vision.pipeline import CVPipeline, VisionConfig
    from vision.ingestion import open_source

    pipeline = CVPipeline(VisionConfig())
    with open_source("rtsp://...", camera_id="cam-01") as src:
        for fd in src.frames(sample_every=2):
            contract = pipeline.process_frame_data(fd)   # → dict
            your_handler(contract)

    # Option B — deserialise from storage / queue
    from vision.pipeline.serializer import contract_to_tracking_results
    tracking_results = contract_to_tracking_results(contract_dict)

──────────────────────────────────────────────────────────────────────────────
What the vision pipeline does NOT do
──────────────────────────────────────────────────────────────────────────────

  ✗ Risk scoring                — belongs to /intelligence/
  ✗ Alert creation              — belongs to /backend/
  ✗ Supabase read/write         — belongs to /backend/ / /supabase/
  ✗ FastAPI routes              — belongs to /backend/
  ✗ WebSocket publish           — belongs to /backend/
  ✗ Notification dispatch       — belongs to /backend/

──────────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

from typing import TypedDict


# ── TypedDict definitions for IDE support ────────────────────────────────────

class TrackedObjectContract(TypedDict):
    track_id: str
    object_class: str                   # "person" | "vehicle" | "animal" | "other"
    confidence: float
    bounding_box: list                  # [x1, y1, x2, y2]
    trajectory: list                    # [[cx, cy], ...]
    movement_direction: str | None      # cardinal or "stationary" or None
    first_seen: str                     # ISO-8601 UTC
    last_seen: str                      # ISO-8601 UTC


class FrameContract(TypedDict):
    camera_id: str
    timestamp: str                      # ISO-8601 UTC
    frame_id: int
    objects: list                       # list[TrackedObjectContract]


# ── Constants ─────────────────────────────────────────────────────────────────

GENERIC_CLASSES = frozenset({"person", "vehicle", "animal", "other"})

MOVEMENT_DIRECTIONS = frozenset({
    "N", "NE", "E", "SE", "S", "SW", "W", "NW", "stationary",
})


# ── Validation helper ────────────────────────────────────────────────────────

def validate_contract(contract: dict) -> list[str]:
    """Validate a contract dict.  Returns a list of error strings (empty = valid).

    The backend team can call this to verify incoming data during integration.
    """
    errors: list[str] = []

    for key in ("camera_id", "timestamp", "frame_id", "objects"):
        if key not in contract:
            errors.append(f"Missing required key: '{key}'")

    if not isinstance(contract.get("frame_id"), int):
        errors.append("'frame_id' must be an int")

    for i, obj in enumerate(contract.get("objects", [])):
        prefix = f"objects[{i}]"
        for key in ("track_id", "object_class", "confidence", "bounding_box", "trajectory"):
            if key not in obj:
                errors.append(f"{prefix}: missing key '{key}'")
        if obj.get("object_class") not in GENERIC_CLASSES:
            errors.append(
                f"{prefix}: 'object_class' must be one of {sorted(GENERIC_CLASSES)}, "
                f"got {obj.get('object_class')!r}"
            )
        bb = obj.get("bounding_box", [])
        if not (isinstance(bb, list) and len(bb) == 4):
            errors.append(f"{prefix}: 'bounding_box' must be [x1, y1, x2, y2]")

    return errors
