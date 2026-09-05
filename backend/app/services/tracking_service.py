from vision.tracking.tracker import SimpleTracker

_tracker = SimpleTracker(max_age=30)


def update(detections: list[dict]) -> list[dict]:
    return _tracker.update(detections)

