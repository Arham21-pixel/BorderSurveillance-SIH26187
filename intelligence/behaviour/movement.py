from __future__ import annotations

from enum import Enum


class CardinalDirection(str, Enum):
    NORTH = "NORTH"
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"
    UNKNOWN = "UNKNOWN"


def infer_direction(
    start: tuple[float, float] | None,
    end: tuple[float, float] | None,
    min_delta: float = 2.0,
) -> CardinalDirection:
    if start is None or end is None:
        return CardinalDirection.UNKNOWN
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    if abs(dx) < min_delta and abs(dy) < min_delta:
        return CardinalDirection.UNKNOWN
    if abs(dx) >= abs(dy):
        return CardinalDirection.EAST if dx > 0 else CardinalDirection.WEST
    return CardinalDirection.SOUTH if dy > 0 else CardinalDirection.NORTH
