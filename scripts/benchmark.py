"""Micro-benchmark for tracker + risk scoring (no GPU required)."""

import time

from intelligence.risk_engine import score_event
from vision.tracking.tracker import SimpleTracker


def main() -> None:
    tracker = SimpleTracker()
    n = 200
    start = time.perf_counter()
    for i in range(n):
        tracker.update([{"x1": i, "y1": 10, "x2": i + 20, "y2": 80, "label": "person", "confidence": 0.8}])
        score_event({"zone_restricted": i % 7 == 0, "dwell_seconds": i % 40, "group_size": 1})
    elapsed = time.perf_counter() - start
    print(f"frames={n} elapsed={elapsed:.3f}s fps={n / elapsed:.1f}")


if __name__ == "__main__":
    main()
