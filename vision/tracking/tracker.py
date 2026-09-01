from backend.app.utils.geometry import iou


class SimpleTracker:
    def __init__(self, max_age: int = 30, iou_threshold: float = 0.3) -> None:
        self.max_age = max_age
        self.iou_threshold = iou_threshold
        self._next_id = 1
        self._tracks: dict[int, dict] = {}

    def update(self, detections: list[dict]) -> list[dict]:
        assigned: set[int] = set()
        outputs: list[dict] = []

        for detection in detections:
            best_id = None
            best_iou = self.iou_threshold
            for track_id, track in self._tracks.items():
                if track_id in assigned:
                    continue
                score = iou(detection, track)
                if score > best_iou:
                    best_iou = score
                    best_id = track_id
            if best_id is None:
                best_id = self._next_id
                self._next_id += 1
            assigned.add(best_id)
            merged = {**detection, "track_id": best_id, "age": 0}
            self._tracks[best_id] = merged
            outputs.append(merged)

        stale = [tid for tid, track in self._tracks.items() if tid not in assigned]
        for tid in stale:
            self._tracks[tid]["age"] += 1
            if self._tracks[tid]["age"] > self.max_age:
                del self._tracks[tid]
        return outputs
