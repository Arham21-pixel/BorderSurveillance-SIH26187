"""
evidence/snapshot_generator.py

Legacy snapshot generator — delegates to evidence.generator.snapshot.
Retained for backwards compatibility.
"""
from __future__ import annotations

from evidence.generator.snapshot import save_snapshot

__all__ = ["save_snapshot"]
