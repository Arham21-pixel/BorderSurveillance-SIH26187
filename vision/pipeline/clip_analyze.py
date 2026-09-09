"""Run one video through YOLO → ByteTrack → behaviour. Emit at most one episode."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
import threading

from evidence.generator.clip import RollingBuffer
from evidence.generator.evidence_engine import EvidenceEngine
from vision.behaviour.analyser import BehaviourAnalyser, BehaviourEvent
from vision.ingestion.video_source import open_source
from vision.pipeline.config import VisionConfig
from vision.pipeline.cv_pipeline import CVPipeline

CLIP_KIND = {
    "walking": "normal",
    "walk": "normal",
    "normal": "normal",
    "loiter": "loitering",
    "loitering": "loitering",
    "border": "zone_intrusion",
    "cross": "zone_intrusion",
    "crossing": "zone_intrusion",
    "group": "group",
    "animal": "animal",
}

CLIP_ALIASES: dict[str, tuple[str, ...]] = {
    "walking.mp4": ("walking.mp4", "walk.mp4", "normal walking.mp4"),
    "loitering.mp4": ("loitering.mp4",),
    "border crossing.mp4": ("border crossing.mp4", "border-crossing.mp4", "bordercrossing.mp4"),
    "group movement.mp4": (
        "group movement.mp4",
        "group ppl moving.mp4",
        "group-movement.mp4",
        "group.mp4",
    ),
    "animal demo.mp4": ("animal demo.mp4", "animal.mp4", "animal video.mp4"),
}

SEARCH_DIRS = (
    Path("data/videos"),
    Path("data/sample_videos"),
    Path("data"),
    Path("frontend/public/videos"),
    Path("frontend/public"),
    Path("videos"),
)

SCENARIO_KINDS = frozenset({"loitering", "zone_intrusion", "group", "animal"})
CLIP_EPOCH = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)


def infer_scenario(filename: str) -> str:
    stem = Path(filename).name.lower()
    for token, kind in CLIP_KIND.items():
        if token in stem:
            return kind
    return "unknown"


def find_clip(name: str, extra_dirs: list[Path] | None = None) -> Path | None:
    wanted = {name.lower()}
    for aliases in CLIP_ALIASES.values():
        if name.lower() in {a.lower() for a in aliases}:
            wanted.update(a.lower() for a in aliases)
    dirs = [*(extra_dirs or []), *SEARCH_DIRS]
    for folder in dirs:
        if not folder.exists():
            continue
        for path in folder.iterdir():
            if path.is_file() and path.name.lower() in wanted:
                return path
    direct = Path(name)
    return direct if direct.is_file() else None


def resolve_model_path() -> str:
    for candidate in (Path("vision/models/yolov8n.pt"), Path("yolov8n.pt")):
        if candidate.is_file():
            return str(candidate)
    return "yolov8n.pt"


def video_timestamp(frame_index: int, fps: float) -> str:
    """Timestamp from video time, not wall clock, so 30s loitering is 30s of footage."""
    rate = fps if fps and fps > 1.0 else 25.0
    ts = CLIP_EPOCH + timedelta(seconds=max(0, frame_index) / rate)
    return ts.isoformat().replace("+00:00", "Z")


def select_clip_event(events: list[BehaviourEvent], expected: str) -> BehaviourEvent | None:
    """Keep the scenario episode; ignore fast-movement pulses on named clips."""
    if expected == "normal" or not events:
        return None
    if expected in SCENARIO_KINDS:
        for event in events:
            if event.kind == expected:
                return event
        return None
    for event in events:
        if event.kind in SCENARIO_KINDS:
            return event
    return None


def _safe_event_id(camera_id: str, kind: str, track_id: str) -> str:
    raw = f"{camera_id}-{kind}-{track_id}"
    return "".join(ch if ch.isalnum() or ch in "-_." else "-" for ch in raw)


@dataclass
class ClipAnalysisResult:
    frames: int = 0
    kind: str = "normal"
    expected: str = "unknown"
    duration_s: float = 0.0
    event: BehaviourEvent | None = None
    evidence: dict = field(default_factory=dict)
    error: str | None = None


_cv: CVPipeline | None = None
_cv_lock = threading.Lock()
_infer_lock = threading.Lock()


def get_cv_pipeline() -> CVPipeline:
    global _cv
    with _cv_lock:
        if _cv is None:
            _cv = CVPipeline(
                VisionConfig(
                    model_path=resolve_model_path(),
                    confidence=0.4,
                    imgsz=640,
                    device="cpu",
                    sample_every=4,
                    preprocess_width=960,
                )
            )
        return _cv


def analyze_clip_file(
    source: str | Path,
    camera_id: str,
    *,
    scenario: str | None = None,
    loitering_threshold: float = 30.0,
    evidence_dir: str = "evidence/events",
) -> ClipAnalysisResult:
    path = Path(source)
    expected = scenario or infer_scenario(path.name)
    if not path.is_file():
        return ClipAnalysisResult(expected=expected, error=f"Video not found: {path}")

    with _infer_lock:
        return _analyze_clip_file_locked(
            path,
            camera_id,
            expected=expected,
            loitering_threshold=loitering_threshold,
            evidence_dir=evidence_dir,
        )


def _analyze_clip_file_locked(
    path: Path,
    camera_id: str,
    *,
    expected: str,
    loitering_threshold: float,
    evidence_dir: str,
) -> ClipAnalysisResult:
    pipeline = get_cv_pipeline()
    if not pipeline.is_ready():
        return ClipAnalysisResult(
            expected=expected,
            error="YOLO model is not loaded (install ultralytics / yolov8n.pt).",
        )

    pipeline.reset_camera(camera_id)

    analyser = BehaviourAnalyser(
        loitering_threshold=loitering_threshold,
        group_min_size=3,
        restricted_zones={},
    )
    evidence_engine = EvidenceEngine(output_dir=evidence_dir)
    buffer = RollingBuffer(max_frames=90)
    result = ClipAnalysisResult(kind="normal", expected=expected)
    zone_ready = False
    last_index = 0
    fps = 25.0

    with open_source(str(path), camera_id=camera_id) as src:
        fps = src.fps or 25.0
        for frame_data in src.frames(sample_every=pipeline.config.sample_every):
            result.frames += 1
            frame = frame_data.frame
            if frame is None:
                continue
            last_index = frame_data.frame_index
            stamp = video_timestamp(frame_data.frame_index, fps)

            if not zone_ready and expected == "zone_intrusion":
                h, w = frame.shape[:2]
                analyser.update_zones(
                    {
                        "restricted": [
                            (w * 0.55, 0.0),
                            (float(w), 0.0),
                            (float(w), float(h)),
                            (w * 0.55, float(h)),
                        ]
                    }
                )
                zone_ready = True

            buffer.push(frame)
            contract = pipeline.process_frame_data(frame_data)
            events = analyser.analyse(
                tracked_objects=contract.get("objects") or [],
                camera_id=camera_id,
                timestamp=stamp,
            )
            picked = select_clip_event(events, expected)
            if picked is None or result.event is not None:
                continue

            result.event = picked
            result.kind = picked.kind
            result.evidence = evidence_engine.generate(
                frame=frame,
                event_id=_safe_event_id(camera_id, picked.kind, picked.track_id),
                camera_id=camera_id,
                timestamp=picked.timestamp,
                tracked_objects=contract.get("objects") or [],
                rolling_buffer=buffer,
                event_context={"kind": picked.kind, "filename": path.name},
            )
            break

    result.duration_s = round(last_index / (fps if fps > 1 else 25.0), 2)
    if expected == "normal":
        result.kind = "normal"
        result.event = None
        result.evidence = {}
    elif result.event is None:
        result.kind = "normal"
    return result
