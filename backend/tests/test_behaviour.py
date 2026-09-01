from vision.behaviour.loitering import is_loitering
from vision.behaviour.zone_detection import in_restricted_zone


def test_loitering_threshold():
    assert is_loitering(dwell_seconds=40, threshold=30) is True
    assert is_loitering(dwell_seconds=5, threshold=30) is False


def test_zone_point():
    polygon = [(0, 0), (10, 0), (10, 10), (0, 10)]
    assert in_restricted_zone((5, 5), polygon) is True
    assert in_restricted_zone((50, 50), polygon) is False
