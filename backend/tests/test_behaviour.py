from datetime import datetime, timedelta, timezone

from vision.behaviour.analyser import BehaviourAnalyser
from vision.behaviour.loitering import is_loitering
from vision.behaviour.zone_detection import in_restricted_zone


def test_loitering_threshold():
    assert is_loitering(dwell_seconds=40, threshold=30) is True
    assert is_loitering(dwell_seconds=5, threshold=30) is False


def test_zone_point():
    polygon = [(0, 0), (10, 0), (10, 10), (0, 10)]
    assert in_restricted_zone((5, 5), polygon) is True
    assert in_restricted_zone((50, 50), polygon) is False


def _ts(base: datetime, seconds: float) -> str:
    return (base + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def _person(tid: str, x: float = 5.0, y: float = 5.0) -> dict:
    return {
        "track_id": tid,
        "object_class": "person",
        "bounding_box": [x - 1, y - 1, x + 1, y + 1],
        "trajectory": [(x, y)],
        "confidence": 0.9,
    }


def test_loitering_emits_once_while_track_stays():
    analyser = BehaviourAnalyser(loitering_threshold=2.0)
    t0 = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)
    kinds = []
    for i in range(6):
        events = analyser.analyse([_person("11")], "CAM-01", _ts(t0, i))
        kinds.extend(e.kind for e in events)
    assert kinds.count("loitering") == 1


def test_zone_emits_once_while_inside():
    zone = [(0, 0), (10, 0), (10, 10), (0, 10)]
    analyser = BehaviourAnalyser(restricted_zones={"fence": zone})
    t0 = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)
    kinds = []
    for i in range(4):
        events = analyser.analyse([_person("17")], "CAM-02", _ts(t0, i))
        kinds.extend(e.kind for e in events)
    assert kinds.count("zone_intrusion") == 1


def test_group_emits_once_not_per_person():
    analyser = BehaviourAnalyser(group_min_size=3, group_radius=50)
    t0 = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)
    people = [_person("1", 5, 5), _person("2", 6, 5), _person("3", 5, 6)]
    first = analyser.analyse(people, "CAM-03", _ts(t0, 0))
    second = analyser.analyse(people, "CAM-03", _ts(t0, 1))
    assert sum(1 for e in first if e.kind == "group") == 1
    assert sum(1 for e in second if e.kind == "group") == 0


def test_animal_emits_once_and_skips_human_events():
    analyser = BehaviourAnalyser(loitering_threshold=1.0)
    t0 = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)
    dog = {
        "track_id": "31",
        "object_class": "dog",
        "bounding_box": [4, 4, 6, 6],
        "trajectory": [(5, 5)],
        "confidence": 0.8,
    }
    kinds = []
    for i in range(4):
        events = analyser.analyse([dog], "CAM-04", _ts(t0, i))
        kinds.extend(e.kind for e in events)
    assert kinds == ["animal"]
