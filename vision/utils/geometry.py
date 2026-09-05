"""
vision/utils/geometry.py

Local geometry helpers for the vision package.
These replace the dependency on backend.app.utils.geometry.
No external dependencies beyond numpy.
"""
from __future__ import annotations

import math
from typing import Sequence





# ---------------------------------------------------------------------------
# Bounding-box helpers
# ---------------------------------------------------------------------------

def iou(box_a: dict | Sequence[float], box_b: dict | Sequence[float]) -> float:
    """Compute Intersection-over-Union for two bounding boxes.

    Accepts either:
    - A dict with keys ``x1``, ``y1``, ``x2``, ``y2``
    - A sequence/list/tuple of four floats ``[x1, y1, x2, y2]``

    Returns
    -------
    float
        IoU score in [0, 1].
    """
    ax1, ay1, ax2, ay2 = _unpack_box(box_a)
    bx1, by1, bx2, by2 = _unpack_box(box_b)

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0.0
    return float(inter_area / union_area)


def centroid(box: dict | Sequence[float]) -> tuple[float, float]:
    """Return the (cx, cy) centroid of a bounding box."""
    x1, y1, x2, y2 = _unpack_box(box)
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def movement_direction(
    trajectory: list[tuple[float, float]],
    smoothing: int = 5,
) -> str | None:
    """Estimate the cardinal movement direction from a list of (cx, cy) points.

    Parameters
    ----------
    trajectory:
        Ordered list of centroid (cx, cy) tuples, oldest first.
    smoothing:
        Number of trailing points to average for direction estimation.

    Returns
    -------
    str | None
        One of ``"N"``, ``"NE"``, ``"E"``, ``"SE"``, ``"S"``, ``"SW"``,
        ``"W"``, ``"NW"``, or ``None`` if insufficient data.
    """
    if len(trajectory) < 2:
        return None

    recent = trajectory[-min(smoothing, len(trajectory)):]
    dx = recent[-1][0] - recent[0][0]
    dy = recent[-1][1] - recent[0][1]

    # Require minimum displacement to report direction
    if abs(dx) < 2 and abs(dy) < 2:
        return "stationary"

    angle = math.degrees(math.atan2(-dy, dx))  # screen-y is inverted
    angle = (angle + 360) % 360

    # Map to 8 cardinal + intercardinal directions
    directions = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
    idx = int((angle + 22.5) / 45) % 8
    return directions[idx]


def box_area(box: dict | Sequence[float]) -> float:
    """Return pixel area of a bounding box."""
    x1, y1, x2, y2 = _unpack_box(box)
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _unpack_box(box: dict | Sequence[float]) -> tuple[float, float, float, float]:
    """Normalise a bounding box to (x1, y1, x2, y2)."""
    if isinstance(box, dict):
        return (
            float(box.get("x1", box.get("bounding_box", [0, 0, 0, 0])[0])),
            float(box.get("y1", box.get("bounding_box", [0, 0, 0, 0])[1])),
            float(box.get("x2", box.get("bounding_box", [0, 0, 0, 0])[2])),
            float(box.get("y2", box.get("bounding_box", [0, 0, 0, 0])[3])),
        )
    seq = list(box)
    return float(seq[0]), float(seq[1]), float(seq[2]), float(seq[3])
