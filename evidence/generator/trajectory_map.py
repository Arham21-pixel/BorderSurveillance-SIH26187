"""
evidence/generator/trajectory_map.py

Draws a trajectory visualisation on a canvas or existing frame.

The trajectory map is a top-down or frame-overlaid view of the path
a tracked object has taken over time.  Returned as a numpy array (image).
The backend can save or upload this image.
"""
from __future__ import annotations

from typing import Optional

import cv2
import numpy as np


def draw_trajectory_on_frame(
    frame: np.ndarray,
    trajectory: list[tuple[float, float] | list],
    track_id: str = "",
    colour: tuple[int, int, int] = (0, 255, 127),
    thickness: int = 2,
    radius: int = 3,
) -> np.ndarray:
    """Overlay a trajectory path on an existing frame.

    Parameters
    ----------
    frame:
        BGR numpy array to draw on (copied — original is not modified).
    trajectory:
        Ordered list of (cx, cy) centroid points.
    track_id:
        Label to render at the last trajectory point.
    colour:
        BGR colour for the path and dots.
    thickness:
        Line thickness.
    radius:
        Circle radius for each waypoint.

    Returns
    -------
    numpy.ndarray
        Annotated frame (copy).
    """
    if not trajectory or frame is None:
        return frame

    canvas = frame.copy()
    pts = [(int(pt[0]), int(pt[1])) for pt in trajectory]

    # Draw path lines
    for i in range(1, len(pts)):
        alpha = 0.3 + 0.7 * (i / len(pts))  # fade-in towards current position
        overlay_colour = tuple(int(c * alpha) for c in colour)
        cv2.line(canvas, pts[i - 1], pts[i], overlay_colour, thickness, cv2.LINE_AA)

    # Draw waypoint dots
    for pt in pts[:-1]:
        cv2.circle(canvas, pt, radius, colour, -1, cv2.LINE_AA)

    # Larger dot at current position
    if pts:
        cv2.circle(canvas, pts[-1], radius + 2, colour, -1, cv2.LINE_AA)
        if track_id:
            cv2.putText(
                canvas, track_id,
                (pts[-1][0] + 5, pts[-1][1] - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, colour, 1, cv2.LINE_AA,
            )

    return canvas


def generate_trajectory_map(
    trajectories: dict[str, list[tuple[float, float] | list]],
    width: int = 640,
    height: int = 480,
    background: tuple[int, int, int] = (20, 20, 20),
) -> np.ndarray:
    """Generate a standalone top-down trajectory map for all tracked objects.

    Parameters
    ----------
    trajectories:
        Dict mapping ``track_id`` → list of (cx, cy) centroid points.
    width / height:
        Output canvas size.
    background:
        BGR background colour.

    Returns
    -------
    numpy.ndarray
        BGR image of the trajectory map.
    """
    canvas = np.full((height, width, 3), background, dtype=np.uint8)

    if not trajectories:
        return canvas

    # Compute bounding box of all points to normalise coordinates
    all_pts = [pt for pts in trajectories.values() for pt in pts]
    if not all_pts:
        return canvas

    xs = [pt[0] for pt in all_pts]
    ys = [pt[1] for pt in all_pts]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    pad = 40

    def norm(cx: float, cy: float) -> tuple[int, int]:
        if x_max > x_min:
            nx = int(pad + (cx - x_min) / (x_max - x_min) * (width - 2 * pad))
        else:
            nx = width // 2
        if y_max > y_min:
            ny = int(pad + (cy - y_min) / (y_max - y_min) * (height - 2 * pad))
        else:
            ny = height // 2
        return nx, ny

    _COLOURS = [
        (0, 255, 127), (0, 191, 255), (255, 165, 0),
        (255, 0, 144), (148, 0, 211), (255, 255, 0),
    ]

    for i, (tid, pts) in enumerate(trajectories.items()):
        colour = _COLOURS[i % len(_COLOURS)]
        norm_pts = [norm(pt[0], pt[1]) for pt in pts]

        for j in range(1, len(norm_pts)):
            cv2.line(canvas, norm_pts[j - 1], norm_pts[j], colour, 2, cv2.LINE_AA)

        for pt in norm_pts[:-1]:
            cv2.circle(canvas, pt, 3, colour, -1)

        if norm_pts:
            cv2.circle(canvas, norm_pts[-1], 5, colour, -1)
            cv2.putText(
                canvas, tid,
                (norm_pts[-1][0] + 4, norm_pts[-1][1] - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, colour, 1, cv2.LINE_AA,
            )

    # Border
    cv2.rectangle(canvas, (1, 1), (width - 2, height - 2), (60, 60, 60), 1)
    return canvas
