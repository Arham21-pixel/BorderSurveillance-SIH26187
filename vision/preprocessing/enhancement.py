"""
vision/preprocessing/enhancement.py

Configurable preprocessing pipeline.

A PreprocessingPipeline is a list of optional steps applied in order:
  1. Resize to target width (aspect-ratio preserving)
  2. Low-light enhancement (CLAHE + gamma correction) — optional
  3. Normalisation hint for YOLO (no-op by default; YOLO handles internally)

Usage
-----
    from vision.preprocessing import PreprocessingPipeline

    pipeline = PreprocessingPipeline(width=640, low_light=True)
    processed = pipeline.apply(frame)
"""
from __future__ import annotations

import numpy as np

from vision.preprocessing.low_light import enhance_low_light
from vision.preprocessing.resize import resize_frame
from vision.utils.logging_config import get_logger

logger = get_logger(__name__)


class PreprocessingPipeline:
    """Applies a configurable series of frame transformations.

    Parameters
    ----------
    width:
        Target frame width in pixels.  Height is scaled proportionally.
        Set to ``None`` to skip resizing.
    low_light:
        If True, apply CLAHE + gamma enhancement before detection.
        Useful for night-time or poorly lit sources.
    gamma:
        Gamma correction value used when ``low_light=True``.  Values > 1
        brighten the image.  Default: 1.4.
    """

    def __init__(
        self,
        width: int | None = 960,
        low_light: bool = False,
        gamma: float = 1.4,
    ) -> None:
        self.width = width
        self.low_light = low_light
        self.gamma = gamma

    def apply(self, frame: np.ndarray) -> np.ndarray:
        """Apply all enabled preprocessing steps to *frame*.

        Parameters
        ----------
        frame:
            BGR numpy array (as returned by OpenCV).

        Returns
        -------
        numpy.ndarray
            Preprocessed BGR frame, ready for YOLO inference.
        """
        if frame is None or frame.size == 0:
            logger.warning("PreprocessingPipeline received empty frame — skipping.")
            return frame

        if self.width is not None:
            frame = resize_frame(frame, width=self.width)

        if self.low_light:
            frame = enhance_low_light(frame, gamma=self.gamma)

        return frame

    def __repr__(self) -> str:
        return (
            f"PreprocessingPipeline("
            f"width={self.width}, "
            f"low_light={self.low_light}, "
            f"gamma={self.gamma})"
        )


# ---------------------------------------------------------------------------
# Convenience function (backwards compatibility)
# ---------------------------------------------------------------------------

def preprocess(
    frame: np.ndarray,
    width: int = 960,
    low_light: bool = False,
    gamma: float = 1.4,
) -> np.ndarray:
    """Functional interface — apply resize + optional low-light enhancement.

    Equivalent to creating a ``PreprocessingPipeline`` and calling ``.apply()``.
    """
    return PreprocessingPipeline(width=width, low_light=low_light, gamma=gamma).apply(frame)
