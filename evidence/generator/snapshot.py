"""
evidence/generator/snapshot.py

Snapshot generator — saves annotated JPEG frames as evidence.

Draws bounding boxes and track IDs on the frame before saving.
Returns the file path for the backend to persist to Supabase Storage.
"""
from __future__ import annotations

import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


# Colour palette indexed by track_id hash for consistent colouring
_COLOURS = [
    (0, 255, 127),    # spring green
    (0, 191, 255),    # deep sky blue
    (255, 165, 0),    # orange
    (255, 0, 144),    # hot pink
    (148, 0, 211),    # dark violet
    (255, 255, 0),    # yellow
    (0, 255, 255),    # cyan
    (255, 69, 0),     # orange-red
]


def _track_colour(track_id: str) -> tuple[int, int, int]:
    """Return a consistent BGR colour for a given track_id string."""
    return _COLOURS[hash(track_id) % len(_COLOURS)]


def save_snapshot(
    frame: np.ndarray,
    output_path: str,
    tracked_objects: list[dict] | None = None,
    quality: int = 90,
) -> str:
    """Save an annotated snapshot JPEG to *output_path*.

    Parameters
    ----------
    frame:
        BGR numpy array (OpenCV format).
    output_path:
        Absolute or relative path for the output JPEG file.
        Parent directories are created automatically.
    tracked_objects:
        Optional list of tracking dicts from the contract (each must have
        ``track_id``, ``bounding_box``, ``object_class``, ``confidence``).
        When provided, bounding boxes and labels are drawn on the frame.
    quality:
        JPEG compression quality 1–100.  Default: 90.

    Returns
    -------
    str
        Absolute path to the saved snapshot.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    annotated = frame.copy() if frame is not None else np.zeros((480, 640, 3), dtype=np.uint8)

    if tracked_objects:
        for obj in tracked_objects:
            try:
                x1, y1, x2, y2 = [int(v) for v in obj["bounding_box"]]
                tid = str(obj.get("track_id", "?"))
                cls = str(obj.get("object_class", ""))
                conf = float(obj.get("confidence", 0.0))
                colour = _track_colour(tid)

                # Bounding box
                cv2.rectangle(annotated, (x1, y1), (x2, y2), colour, 2)

                # Label background
                label = f"{tid} {cls} {conf:.2f}"
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(annotated, (x1, y1 - th - 6), (x1 + tw + 4, y1), colour, -1)

                # Label text
                cv2.putText(
                    annotated, label,
                    (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA,
                )
            except (KeyError, TypeError, ValueError):
                continue

    # Timestamp watermark
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    cv2.putText(
        annotated, ts, (8, annotated.shape[0] - 8),
        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA,
    )

    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    cv2.imwrite(str(path), annotated, encode_params)
    return str(path.resolve())
