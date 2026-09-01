from evidence.evidence_package import build_package


def capture(camera_id: str, frame, detections: list[dict], event_id: str) -> dict:
    return build_package(camera_id=camera_id, frame=frame, detections=detections, event_id=event_id)
