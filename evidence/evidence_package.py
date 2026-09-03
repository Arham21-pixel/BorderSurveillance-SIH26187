"""
evidence/evidence_package.py

Full EvidencePackage builder — delegates to the new EvidenceEngine.
Retained for backwards compatibility; prefer using EvidenceEngine directly.
"""
from __future__ import annotations

from evidence.generator.evidence_engine import EvidenceEngine
from evidence.generator.clip import RollingBuffer


def build_package(
    camera_id: str,
    frame,
    tracked_objects: list[dict],
    event_id: str,
    output_dir: str = "evidence/events",
    timestamp: str | None = None,
    rolling_buffer: RollingBuffer | None = None,
    event_context: dict | None = None,
) -> dict:
    """Generate a complete evidence package for an alert event.

    This function is a convenience wrapper around :class:`EvidenceEngine`.

    Parameters
    ----------
    camera_id:
        Source camera identifier.
    frame:
        Current BGR numpy array at event time.
    tracked_objects:
        List of backend-contract object dicts.
    event_id:
        Unique alert/event identifier.
    output_dir:
        Root directory for evidence file output.
    timestamp:
        ISO-8601 UTC timestamp; auto-generated if None.
    rolling_buffer:
        Optional rolling frame buffer to generate a clip from.
    event_context:
        Optional free-form context dict.

    Returns
    -------
    dict
        EvidencePackage with keys: ``event_id``, ``camera_id``,
        ``timestamp``, ``snapshot``, ``clip``, ``trajectory_map``, ``metadata``.
    """
    engine = EvidenceEngine(output_dir=output_dir)
    return engine.generate(
        frame=frame,
        event_id=event_id,
        camera_id=camera_id,
        timestamp=timestamp,
        tracked_objects=tracked_objects,
        rolling_buffer=rolling_buffer,
        event_context=event_context,
    )
