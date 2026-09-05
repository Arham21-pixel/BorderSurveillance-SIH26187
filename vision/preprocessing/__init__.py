"""
vision/preprocessing — frame preprocessing sub-package.

Public API
----------
PreprocessingPipeline : Configurable resize + low-light enhancement pipeline.
preprocess            : Functional convenience wrapper.
resize_frame          : Aspect-ratio-preserving resize.
enhance_low_light     : CLAHE + gamma low-light enhancement.
"""

from vision.preprocessing.enhancement import PreprocessingPipeline, preprocess
from vision.preprocessing.low_light import enhance_low_light
from vision.preprocessing.resize import resize_frame

__all__ = [
    "PreprocessingPipeline",
    "preprocess",
    "resize_frame",
    "enhance_low_light",
]
