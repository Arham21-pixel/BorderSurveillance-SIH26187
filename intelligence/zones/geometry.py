from __future__ import annotations

from math import isclose

Point = tuple[float, float]


def point_in_polygon(point: Point, polygon: list[Point]) -> bool:
    if len(polygon) < 3:
        return False
    x, y = point
    inside = False
    j = len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) if not isclose(yj, yi) else 1e-9) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def segment_crosses_polygon_boundary(start: Point, end: Point, polygon: list[Point]) -> bool:
    return point_in_polygon(start, polygon) != point_in_polygon(end, polygon)
