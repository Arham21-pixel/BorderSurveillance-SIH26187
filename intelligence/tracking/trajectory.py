from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from dataclasses import field
from typing import Deque


@dataclass(slots=True)
class TrajectoryStore:
    max_points: int = 120
    _paths: dict[str, Deque[tuple[float, float]]] = field(init=False)

    def __post_init__(self) -> None:
        self._paths = defaultdict(lambda: deque(maxlen=self.max_points))

    def add(self, track_key: str, point: tuple[float, float]) -> None:
        self._paths[track_key].append(point)

    def get(self, track_key: str) -> list[tuple[float, float]]:
        return list(self._paths.get(track_key, []))


def detect_unusual_trajectory(
    direction: str,
    expected_directions: list[str] | None,
) -> bool:
    if not expected_directions:
        return False
    return direction not in expected_directions
