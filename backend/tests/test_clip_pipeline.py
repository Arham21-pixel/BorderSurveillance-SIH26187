import asyncio

from backend.services.clip_pipeline import publish_clip_episode, resolve_camera_id
from backend.services.ingest_service import IngestService
from backend.services.repository import InMemoryRepository
from vision.behaviour.analyser import BehaviourEvent
from vision.pipeline.clip_analyze import infer_scenario, select_clip_event, video_timestamp


def _event(kind: str, camera_id: str = "CAM-01", obj: str = "person") -> BehaviourEvent:
    return BehaviourEvent(
        track_id="7",
        camera_id=camera_id,
        timestamp="2026-09-09T12:00:30Z",
        kind=kind,
        description=f"{kind} episode",
        confidence=0.8,
        features={"dwell_seconds": 32.0, "is_animal": obj != "person"},
        object_class=obj,
        bounding_box=[10, 10, 40, 80],
        trajectory=[(20.0, 40.0), (21.0, 41.0)],
    )


def test_infer_scenario_names():
    assert infer_scenario("walking.mp4") == "normal"
    assert infer_scenario("loitering.mp4") == "loitering"
    assert infer_scenario("border crossing.mp4") == "zone_intrusion"
    assert infer_scenario("group ppl moving.mp4") == "group"
    assert infer_scenario("animal video.mp4") == "animal"


def test_select_clip_event_waits_for_expected_kind():
    fast = _event("fast_movement")
    loiter = _event("loitering")
    assert select_clip_event([fast], "loitering") is None
    assert select_clip_event([fast, loiter], "loitering") is loiter
    assert select_clip_event([loiter], "normal") is None
    assert select_clip_event([_event("animal")], "animal").kind == "animal"


def test_video_timestamp_is_footage_time_not_wall_clock():
    first = video_timestamp(0, 25.0)
    later = video_timestamp(750, 25.0)
    assert first.startswith("2026-09-09T12:00:00")
    assert "12:00:30" in later


def test_publish_loitering_is_one_event_one_alert():
    repo = InMemoryRepository()
    service = IngestService(repo)
    uid, code = resolve_camera_id(repo, "CAM-01")
    payload = asyncio.run(publish_clip_episode(service, uid, code, _event("loitering"), {}))
    assert payload["alert_created"] is True
    assert payload["kind"] == "loitering"
    assert len(repo.events) == 1
    assert len(repo.alerts) == 1
    assert len(repo.risk_scores) == 1


def test_publish_group_creates_alert_even_if_score_is_moderate():
    repo = InMemoryRepository()
    service = IngestService(repo)
    uid, code = resolve_camera_id(repo, "CAM-03")
    payload = asyncio.run(publish_clip_episode(service, uid, code, _event("group", "CAM-03"), {}))
    assert payload["alert_created"] is True
    assert payload["event_type"] == "group_movement"
    assert len(repo.alerts) == 1


def test_publish_animal_is_event_without_alert():
    repo = InMemoryRepository()
    service = IngestService(repo)
    uid, code = resolve_camera_id(repo, "CAM-04")
    dog = _event("animal", "CAM-04", obj="dog")
    payload = asyncio.run(publish_clip_episode(service, uid, code, dog, {}))
    assert payload["alert_created"] is False
    assert payload["alert_id"] is None
    assert len(repo.events) == 1
    assert len(repo.alerts) == 0
    assert payload["risk_score"] < 30


def test_zone_maps_to_restricted_zone_entry():
    repo = InMemoryRepository()
    service = IngestService(repo)
    uid, code = resolve_camera_id(repo, "CAM-02")
    payload = asyncio.run(
        publish_clip_episode(service, uid, code, _event("zone_intrusion", "CAM-02"), {})
    )
    assert payload["event_type"] == "restricted_zone_entry"
    assert payload["alert_created"] is True
