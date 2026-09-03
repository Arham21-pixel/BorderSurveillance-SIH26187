"""
evidence/__init__.py — evidence generation package.

Public API
----------
EvidenceEngine  : Main evidence orchestrator.
RollingBuffer   : Rolling frame buffer for clip generation.
build_package   : Legacy convenience wrapper (backwards compatibility).
"""

from evidence.generator.clip import RollingBuffer
from evidence.generator.evidence_engine import EvidenceEngine

# ── Backwards-compatible legacy API ──────────────────────────────────────────
from evidence.evidence_package import build_package

__all__ = ["EvidenceEngine", "RollingBuffer", "build_package"]
