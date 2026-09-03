"""
evidence/generator — evidence artifact generation sub-package.

Public API
----------
EvidenceEngine      : Orchestrates all evidence generators.
RollingBuffer       : Circular frame buffer for clip generation.
save_snapshot       : Save annotated snapshot JPEG.
write_clip          : Write frames to MP4 clip.
flush_clip          : Flush a RollingBuffer to a clip file.
draw_trajectory_on_frame : Overlay trajectory on a frame.
generate_trajectory_map  : Standalone top-down trajectory map.
write_metadata      : Write event metadata JSON.
"""

from evidence.generator.clip import RollingBuffer, flush_clip, write_clip
from evidence.generator.evidence_engine import EvidenceEngine
from evidence.generator.metadata import write_metadata
from evidence.generator.snapshot import save_snapshot
from evidence.generator.trajectory_map import (
    draw_trajectory_on_frame,
    generate_trajectory_map,
)

__all__ = [
    "EvidenceEngine",
    "RollingBuffer",
    "save_snapshot",
    "write_clip",
    "flush_clip",
    "draw_trajectory_on_frame",
    "generate_trajectory_map",
    "write_metadata",
]
