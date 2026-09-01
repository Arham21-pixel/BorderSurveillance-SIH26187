from vision.tracking.tracker import SimpleTracker


def test_tracker_keeps_id_across_small_motion():
    tracker = SimpleTracker(max_age=5)
    first = tracker.update([{"x1": 10, "y1": 10, "x2": 40, "y2": 80, "label": "person", "confidence": 0.9}])
    second = tracker.update([{"x1": 12, "y1": 12, "x2": 42, "y2": 82, "label": "person", "confidence": 0.88}])
    assert first[0]["track_id"] == second[0]["track_id"]
