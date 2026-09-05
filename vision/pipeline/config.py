"""
vision/pipeline/config.py

VisionConfig — single source of truth for all pipeline parameters.

Instantiate this once and pass it to CVPipeline.
No environment variables or backend settings are touched here.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class VisionConfig:
    """All tunable parameters for the CV pipeline.

    Attributes
    ----------
    model_path:
        Path to YOLO ``.pt`` or ``.onnx`` weights file.
        If the file doesn't exist, Ultralytics will auto-download ``yolov8n.pt``.
    confidence:
        Minimum YOLO detection confidence (0–1).  Lower = more detections but
        more noise.  Recommended: 0.35–0.50 for border surveillance.
    imgsz:
        YOLO inference resolution (square).  640 balances speed and accuracy
        on CPU.  Use 320 for very limited hardware; 1280 for high accuracy.
    device:
        ``"cpu"`` (default — no GPU required) or ``"cuda:0"`` / ``"mps"``.
    sample_every:
        Run detection only on every N-th frame from the video source.
        1 = every frame (slowest), 3 = every third frame, etc.
        Higher values reduce CPU load but may miss fast-moving objects.
    preprocess_width:
        Resize frames to this width before inference.
        None = no resize (use source resolution).
    low_light:
        Enable CLAHE + gamma enhancement for dark environments.
    gamma:
        Gamma correction value for low-light enhancement (>1 brightens).
    tracker_max_age:
        Frames before an unmatched track is discarded.
    tracker_iou_high:
        IoU threshold for first-stage (high-confidence) track matching.
    tracker_iou_low:
        IoU threshold for second-stage (low-confidence) track matching.
    tracker_high_conf:
        Confidence boundary between high/low-confidence tiers in the tracker.
    log_level:
        Python logging level name, e.g. ``"INFO"``, ``"DEBUG"``, ``"WARNING"``.
    """

    # ── Detection ─────────────────────────────────────────────────────────────
    model_path: str = "yolov8n.pt"
    confidence: float = 0.40
    imgsz: int = 640
    device: str = "cpu"

    # ── Sampling ──────────────────────────────────────────────────────────────
    sample_every: int = 1

    # ── Preprocessing ─────────────────────────────────────────────────────────
    preprocess_width: int | None = 960
    low_light: bool = False
    gamma: float = 1.4

    # ── Tracking ──────────────────────────────────────────────────────────────
    tracker_max_age: int = 30
    tracker_iou_high: float = 0.50
    tracker_iou_low: float = 0.30
    tracker_high_conf: float = 0.50

    # ── Logging ───────────────────────────────────────────────────────────────
    log_level: str = "INFO"

    def validate(self) -> None:
        """Raise ValueError for obviously invalid parameter combinations."""
        if not (0.0 < self.confidence <= 1.0):
            raise ValueError(f"confidence must be in (0, 1], got {self.confidence}")
        if self.imgsz < 32 or self.imgsz % 32 != 0:
            raise ValueError(f"imgsz must be a positive multiple of 32, got {self.imgsz}")
        if self.sample_every < 1:
            raise ValueError(f"sample_every must be >= 1, got {self.sample_every}")
        if self.preprocess_width is not None and self.preprocess_width < 64:
            raise ValueError(f"preprocess_width must be >= 64 (or None), got {self.preprocess_width}")


# ---------------------------------------------------------------------------
# Preset configs for common scenarios
# ---------------------------------------------------------------------------

def lightweight_cpu_config() -> VisionConfig:
    """Fast config for ordinary laptops / edge devices (no GPU required)."""
    return VisionConfig(
        model_path="yolov8n.pt",
        confidence=0.40,
        imgsz=320,
        device="cpu",
        sample_every=3,
        preprocess_width=640,
    )


def balanced_config() -> VisionConfig:
    """Balanced accuracy/speed config for mid-range hardware."""
    return VisionConfig(
        model_path="yolov8n.pt",
        confidence=0.40,
        imgsz=640,
        device="cpu",
        sample_every=2,
        preprocess_width=960,
    )


def high_accuracy_config() -> VisionConfig:
    """High-accuracy config — expects a decent GPU."""
    return VisionConfig(
        model_path="yolov8m.pt",
        confidence=0.35,
        imgsz=1280,
        device="cuda:0",
        sample_every=1,
        preprocess_width=None,
    )
