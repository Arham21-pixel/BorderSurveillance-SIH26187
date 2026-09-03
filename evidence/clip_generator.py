"""
evidence/clip_generator.py

Legacy clip generator — delegates to evidence.generator.clip.
Retained for backwards compatibility.
"""
from __future__ import annotations

from evidence.generator.clip import RollingBuffer, flush_clip, write_clip

__all__ = ["write_clip", "flush_clip", "RollingBuffer"]
