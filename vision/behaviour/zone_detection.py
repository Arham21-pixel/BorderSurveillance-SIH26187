"""
vision/behaviour/zone_detection.py

Zone / restricted-area detection — no backend dependency.
Uses the local geometry helper from vision.utils.geometry.
"""
from __future__ import annotations

from vision.utils.geometry import _unpack_box


def point_in_polygon(
    point: tuple[float, float],
    polygon: list[tuple[float, float]],
) -> bool:
    """Ray-casting algorithm to test if *point* is inside *polygon*.

    Parameters
    ----------
    point:
        (x, y) coordinate to test.
    polygon:
        List of (x, y) vertices defining the zone boundary.

    Returns
    -------
    bool
        True if the point is inside (or on the edge of) the polygon.
    """
    if not polygon or len(polygon) < 3:
        return False

    x, y = point
    inside = False
    j = len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def in_restricted_zone(
    point: tuple[float, float],
    polygon: list[tuple[float, float]],
) -> bool:
    """Return True if *point* is inside the restricted polygon zone."""
    return point_in_polygon(point, polygon)


def centroid_in_zone(
    bounding_box: list[float],
    polygon: list[tuple[float, float]],
) -> bool:
    """Return True if the centroid of *bounding_box* is inside *polygon*.

    Parameters
    ----------
    bounding_box:
        [x1, y1, x2, y2] pixel coordinates.
    polygon:
        Zone boundary vertices.
    """
    x1, y1, x2, y2 = _unpack_box(bounding_box)
    cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
    return in_restricted_zone((cx, cy), polygon)
