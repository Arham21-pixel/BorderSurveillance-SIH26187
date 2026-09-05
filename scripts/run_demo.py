import os
import sys
from pathlib import Path

# Make sure repo root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from intelligence.event_classifier import classify
from intelligence.risk_engine import score_event, severity_for
from vision.behaviour.loitering import is_loitering
from vision.tracking.tracker import SimpleTracker



def synthetic_detections(frame_index: int) -> list[dict]:
    x = 40 + frame_index * 3
    return [{"x1": x, "y1": 80, "x2": x + 60, "y2": 240, "label": "person", "confidence": 0.9}]


def main() -> None:
    tracker = SimpleTracker()
    dwell = 0
    print("Border AI Sentinel demo - synthetic walk along fence\n")

    for i in range(40):
        tracks = tracker.update(synthetic_detections(i))
        dwell += 1
        features = {
            "zone_restricted": i > 12,
            "dwell_seconds": dwell if is_loitering(dwell, 25) else dwell / 2,
            "group_size": 1,
        }
        score = score_event(features)
        kind = classify(features)
        track_id = tracks[0]["track_id"]
        print(f"frame={i:02d} track={track_id} kind={kind:16s} score={score:.2f} severity={severity_for(score)}")
    Path("data/demo").mkdir(parents=True, exist_ok=True)
    np.save("data/demo/last_demo.npy", np.array([1]))
    print("\nDemo complete. Start the API + frontend for the operator view.")


if __name__ == "__main__":
    main()
