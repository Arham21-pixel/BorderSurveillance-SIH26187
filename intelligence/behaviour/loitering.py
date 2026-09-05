from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class LoiterState:
    first_seen_at: dict[str, datetime]
    last_emitted_at: dict[str, datetime]


def dwell_seconds(first_seen_at: datetime, current_timestamp: datetime) -> float:
    return max(0.0, (current_timestamp - first_seen_at).total_seconds())


def evaluate_loitering(
    state: LoiterState,
    track_key: str,
    current_timestamp: datetime,
    threshold_seconds: int,
    dedupe_seconds: int,
) -> tuple[bool, float]:
    if track_key not in state.first_seen_at:
        state.first_seen_at[track_key] = current_timestamp
        return False, 0.0

    dwell = dwell_seconds(state.first_seen_at[track_key], current_timestamp)
    if dwell < threshold_seconds:
        return False, dwell

    last_emitted = state.last_emitted_at.get(track_key)
    if last_emitted is not None and (current_timestamp - last_emitted).total_seconds() < dedupe_seconds:
        return False, dwell

    state.last_emitted_at[track_key] = current_timestamp
    return True, dwell
