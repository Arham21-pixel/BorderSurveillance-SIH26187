"""
vision/detection — YOLO object detection sub-package.

Public API
----------
Detector      : Main detection class (accepts VisionConfig params).
DetectionResult: Typed output object for one detected object.
run_inference : Convenience function for single-frame inference.
WATCH_CLASSES : Set of class names the pipeline watches by default.
generic_class : Maps fine-grained class names to generic categories.
"""

from vision.detection.classes import WATCH_CLASSES, generic_class
from vision.detection.detector import Detector
from vision.detection.inference import run_inference
from vision.detection.result import DetectionResult

__all__ = [
    "Detector",
    "DetectionResult",
    "run_inference",
    "WATCH_CLASSES",
    "generic_class",
]
