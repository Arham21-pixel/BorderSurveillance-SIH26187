from vision.tracking.tracker import SimpleTracker


class TrackManager:
    def __init__(self, max_age: int = 30) -> None:
        self.tracker = SimpleTracker(max_age=max_age)

    def update(self, detections: list[dict]) -> list[dict]:
        return self.tracker.update(detections)
