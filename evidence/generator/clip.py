"""
evidence/generator/clip.py

Rolling video buffer + short clip writer.

The RollingBuffer keeps the last N seconds of frames in memory.
When an event is detected, call flush_clip() to write a short MP4 clip
containing those frames.

The backend can later upload the returned clip path to Supabase Storage.
"""
from __future__ import annotations

import collections
import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


class RollingBuffer:
    """In-memory circular buffer of recent frames.

    Parameters
    ----------
    max_frames:
        Maximum number of frames to keep.  Older frames are dropped.
        At 12 FPS and max_frames=120 → 10 seconds of history.
    """

    def __init__(self, max_frames: int = 120) -> None:
        self._buffer: collections.deque = collections.deque(maxlen=max_frames)
        self.max_frames = max_frames

    def push(self, frame: np.ndarray) -> None:
        """Add a frame to the buffer."""
        if frame is not None and frame.size > 0:
            self._buffer.append(frame.copy())

    def frames(self) -> list[np.ndarray]:
        """Return a copy of all buffered frames (oldest first)."""
        return list(self._buffer)

    def clear(self) -> None:
        """Empty the buffer."""
        self._buffer.clear()

    @property
    def size(self) -> int:
        return len(self._buffer)


def write_clip(
    frames: list[np.ndarray],
    output_path: str,
    fps: float = 12.0,
) -> str | None:
    """Write a list of frames to an MP4 clip file.

    Parameters
    ----------
    frames:
        Ordered list of BGR numpy arrays to encode.
    output_path:
        Destination file path (e.g. ``evidence/clips/<event_id>.mp4``).
    fps:
        Output frame rate.  Default: 12 FPS.

    Returns
    -------
    str | None
        Absolute path of the written clip, or None if writing failed.
    """
    if not frames:
        return None

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    h, w = frames[0].shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")  # type: ignore[attr-defined]

    writer = cv2.VideoWriter(str(path), fourcc, fps, (w, h))
    if not writer.isOpened():
        return None

    for frame in frames:
        if frame.shape[:2] != (h, w):
            frame = cv2.resize(frame, (w, h))
        writer.write(frame)

    writer.release()
    return str(path.resolve())


def flush_clip(
    buffer: RollingBuffer,
    output_path: str,
    fps: float = 12.0,
    clear_after: bool = False,
) -> str | None:
    """Flush the rolling buffer contents to a clip file.

    Parameters
    ----------
    buffer:
        A RollingBuffer instance.
    output_path:
        Output clip path.
    fps:
        Output frame rate.
    clear_after:
        If True, clear the buffer after writing.

    Returns
    -------
    str | None
        Path to the written clip, or None if the buffer was empty.
    """
    frames = buffer.frames()
    result = write_clip(frames, output_path, fps=fps)
    if clear_after:
        buffer.clear()
    return result
