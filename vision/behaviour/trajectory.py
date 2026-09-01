from collections import defaultdict, deque


class TrajectoryStore:
    def __init__(self, maxlen: int = 60) -> None:
        self._points: dict[int, deque] = defaultdict(lambda: deque(maxlen=maxlen))

    def add(self, track_id: int, point: tuple[float, float]) -> None:
        self._points[track_id].append(point)

    def path(self, track_id: int) -> list[tuple[float, float]]:
        return list(self._points.get(track_id, []))
