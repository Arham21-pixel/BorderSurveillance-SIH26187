from vision.tracking.track_manager import TrackManager

_manager = TrackManager(max_age=30)


def update(detections: list[dict]) -> list[dict]:
    return _manager.update(detections)
