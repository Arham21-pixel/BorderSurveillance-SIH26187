from __future__ import annotations

from math import hypot


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return hypot(a[0] - b[0], a[1] - b[1])


def detect_group_movement(
    active_tracks: list[dict],
    distance_threshold: float,
    min_members: int,
) -> list[list[str]]:
    groups: list[list[str]] = []
    used: set[str] = set()

    for i, track in enumerate(active_tracks):
        track_id = str(track["track_id"])
        if track_id in used:
            continue
        center = track["center"]
        group = [track_id]
        for j in range(i + 1, len(active_tracks)):
            other = active_tracks[j]
            other_id = str(other["track_id"])
            if other_id in used:
                continue
            if _distance(center, other["center"]) <= distance_threshold:
                group.append(other_id)
        if len(group) >= min_members:
            used.update(group)
            groups.append(group)

    return groups
