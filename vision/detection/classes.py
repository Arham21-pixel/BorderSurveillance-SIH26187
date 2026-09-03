"""
vision/detection/classes.py

Defines the YOLO/COCO classes relevant to border surveillance.
The WATCH_CLASSES set controls which detections the pipeline emits.
GENERIC_CLASS_MAP normalises class names for the backend integration contract.
"""

# ── Primary watch classes ─────────────────────────────────────────────────────
# These classes are emitted by default.  Add or remove as needed.
WATCH_CLASSES: set[str] = {
    # People
    "person",
    # Wheeled vehicles
    "bicycle",
    "motorcycle",
    "car",
    "truck",
    "bus",
    "van",
    # Heavy / off-road
    "boat",
    "train",
    # Animals (relevant for wildlife crossings)
    "horse",
    "cow",
    "sheep",
    "dog",
    "cat",
    "bear",
    "elephant",
    "zebra",
    "giraffe",
    # Aviation (if model supports)
    "airplane",
}

# ── Generic grouping for the backend contract ─────────────────────────────────
# Maps fine-grained YOLO class names → generic category consumed by intelligence.
GENERIC_CLASS_MAP: dict[str, str] = {
    "person": "person",
    "bicycle": "vehicle",
    "motorcycle": "vehicle",
    "car": "vehicle",
    "truck": "vehicle",
    "bus": "vehicle",
    "van": "vehicle",
    "boat": "vehicle",
    "train": "vehicle",
    "airplane": "vehicle",
    "horse": "animal",
    "cow": "animal",
    "sheep": "animal",
    "dog": "animal",
    "cat": "animal",
    "bear": "animal",
    "elephant": "animal",
    "zebra": "animal",
    "giraffe": "animal",
}


def generic_class(class_name: str) -> str:
    """Return the generic category for a YOLO class name.

    Falls back to ``"other"`` for any class not in GENERIC_CLASS_MAP.
    """
    return GENERIC_CLASS_MAP.get(class_name, "other")
