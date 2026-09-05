"""
vision/ingestion/video_source.py

Reusable VideoSource abstraction for RTSP streams, MP4 files, and webcams.

Usage
-----
    from vision.ingestion import open_source

    with open_source("rtsp://192.168.1.10/live") as src:
        for frame_data in src.frames(sample_every=2):
            process(frame_data)

    with open_source("data/video.mp4") as src:
        for frame_data in src.frames():
            process(frame_data)

    with open_source(0) as src:   # webcam index
        for frame_data in src.frames():
            process(frame_data)
"""
from __future__ import annotations

import abc
import datetime
import time
from dataclasses import dataclass
from typing import Generator, Optional, Union

import cv2

from vision.utils.logging_config import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Frame container
# ---------------------------------------------------------------------------

@dataclass
class FrameData:
    """A single decoded video frame plus associated metadata.

    Attributes
    ----------
    frame:
        BGR numpy array (OpenCV format).
    frame_index:
        Sequential zero-based frame counter within this source session.
    timestamp:
        ISO-8601 UTC string at the moment the frame was read.
    camera_id:
        Caller-supplied identifier for this source.
    source_type:
        One of ``"rtsp"``, ``"file"``, ``"webcam"``.
    fps:
        Reported FPS of the underlying capture (0 if unavailable).
    width:
        Frame pixel width.
    height:
        Frame pixel height.
    """

    frame: object          # numpy.ndarray
    frame_index: int
    timestamp: str
    camera_id: str
    source_type: str
    fps: float
    width: int
    height: int


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class VideoSource(abc.ABC):
    """Abstract base class for all video sources.

    Concrete subclasses must implement :meth:`_open_capture` and
    expose ``source_type``.

    Parameters
    ----------
    camera_id:
        Logical name used throughout the pipeline (e.g. ``"cam-border-01"``).
    reconnect_attempts:
        How many times to retry opening the source before giving up.
    reconnect_delay:
        Seconds to wait between reconnection attempts.
    """

    source_type: str = "base"

    def __init__(
        self,
        camera_id: str = "default",
        reconnect_attempts: int = 3,
        reconnect_delay: float = 2.0,
    ) -> None:
        self.camera_id = camera_id
        self.reconnect_attempts = reconnect_attempts
        self.reconnect_delay = reconnect_delay
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame_index: int = 0
        self._is_open: bool = False

    # ── Abstract ─────────────────────────────────────────────────────────────

    @abc.abstractmethod
    def _open_capture(self) -> cv2.VideoCapture:
        """Open and return a cv2.VideoCapture for this source."""
        ...

    # ── Context manager ───────────────────────────────────────────────────────

    def __enter__(self) -> "VideoSource":
        self.open()
        return self

    def __exit__(self, *_) -> None:
        self.release()

    # ── Lifecycle ────────────────────────────────────────────────────────────

    def open(self) -> bool:
        """Open the video source.  Returns True on success."""
        for attempt in range(1, self.reconnect_attempts + 1):
            try:
                cap = self._open_capture()
                if cap.isOpened():
                    self._cap = cap
                    self._is_open = True
                    self._frame_index = 0
                    logger.info(
                        "[%s] Opened source '%s' (attempt %d)",
                        self.source_type,
                        self.camera_id,
                        attempt,
                    )
                    return True
                cap.release()
            except Exception as exc:
                logger.error(
                    "[%s] Open error (attempt %d/%d): %s",
                    self.source_type,
                    attempt,
                    self.reconnect_attempts,
                    exc,
                )
            if attempt < self.reconnect_attempts:
                time.sleep(self.reconnect_delay)

        logger.error(
            "[%s] Failed to open source '%s' after %d attempts.",
            self.source_type,
            self.camera_id,
            self.reconnect_attempts,
        )
        self._is_open = False
        return False

    def release(self) -> None:
        """Release the underlying cv2.VideoCapture safely."""
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception as exc:
                logger.warning("[%s] Error releasing capture: %s", self.source_type, exc)
            finally:
                self._cap = None
                self._is_open = False
        logger.info("[%s] Source '%s' released.", self.source_type, self.camera_id)

    @property
    def is_open(self) -> bool:
        return self._is_open and self._cap is not None and self._cap.isOpened()

    # ── Properties ───────────────────────────────────────────────────────────

    @property
    def fps(self) -> float:
        if self._cap is None:
            return 0.0
        return float(self._cap.get(cv2.CAP_PROP_FPS) or 0.0)

    @property
    def width(self) -> int:
        if self._cap is None:
            return 0
        return int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))

    @property
    def height(self) -> int:
        if self._cap is None:
            return 0
        return int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    @property
    def frame_count(self) -> int:
        """Total frame count (files only; returns -1 for streams)."""
        if self._cap is None:
            return -1
        return int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT) or -1)

    # ── Frame iteration ───────────────────────────────────────────────────────

    def read_frame(self) -> Optional["FrameData"]:
        """Read a single frame.  Returns None on failure or end-of-source."""
        if not self.is_open:
            logger.warning("[%s] Attempted read on closed source '%s'", self.source_type, self.camera_id)
            return None

        ret, frame = self._cap.read()  # type: ignore[union-attr]
        if not ret or frame is None or frame.size == 0:
            logger.debug("[%s] Empty/dropped frame at index %d", self.source_type, self._frame_index)
            return None

        ts = datetime.datetime.utcnow().isoformat() + "Z"
        data = FrameData(
            frame=frame,
            frame_index=self._frame_index,
            timestamp=ts,
            camera_id=self.camera_id,
            source_type=self.source_type,
            fps=self.fps,
            width=frame.shape[1],
            height=frame.shape[0],
        )
        self._frame_index += 1
        return data

    def frames(
        self,
        sample_every: int = 1,
        max_frames: Optional[int] = None,
    ) -> Generator[FrameData, None, None]:
        """Yield FrameData objects from the source.

        Parameters
        ----------
        sample_every:
            Yield only every N-th frame (1 = every frame, 2 = every other, …).
        max_frames:
            Stop after this many *yielded* frames.  None = unlimited.
        """
        if not self.is_open:
            if not self.open():
                logger.error("[%s] Cannot iterate — source not open.", self.source_type)
                return

        yielded = 0
        read_index = 0

        while True:
            frame_data = self.read_frame()

            if frame_data is None:
                # For streams: transient drop — continue.  For files: likely EOF.
                if self.source_type == "file":
                    logger.info("[%s] End of file reached (camera_id=%s).", self.source_type, self.camera_id)
                    break
                # For streams: skip this frame and carry on
                continue

            if read_index % sample_every == 0:
                yield frame_data
                yielded += 1
                if max_frames is not None and yielded >= max_frames:
                    break

            read_index += 1


# ---------------------------------------------------------------------------
# Concrete sources
# ---------------------------------------------------------------------------

class FileSource(VideoSource):
    """Reads frames from a local video file (MP4, AVI, MKV, etc.).

    Parameters
    ----------
    path:
        Absolute or relative path to the video file.
    camera_id:
        Logical camera name.  Defaults to the filename stem.
    """

    source_type = "file"

    def __init__(self, path: str, camera_id: Optional[str] = None, **kwargs) -> None:
        import os
        _camera_id = camera_id or os.path.splitext(os.path.basename(path))[0]
        super().__init__(camera_id=_camera_id, **kwargs)
        self._path = path

    def _open_capture(self) -> cv2.VideoCapture:
        return cv2.VideoCapture(self._path)


class RTSPSource(VideoSource):
    """Reads frames from an RTSP network stream.

    Parameters
    ----------
    url:
        RTSP URL, e.g. ``"rtsp://user:pass@192.168.1.10:554/live"``.
    camera_id:
        Logical camera name.
    buffer_size:
        Internal OpenCV capture buffer (frames).  Smaller = lower latency.
    """

    source_type = "rtsp"

    def __init__(
        self,
        url: str,
        camera_id: str = "rtsp-cam",
        buffer_size: int = 2,
        **kwargs,
    ) -> None:
        super().__init__(camera_id=camera_id, **kwargs)
        self._url = url
        self._buffer_size = buffer_size

    def _open_capture(self) -> cv2.VideoCapture:
        cap = cv2.VideoCapture(self._url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, self._buffer_size)
        return cap


class WebcamSource(VideoSource):
    """Reads frames from a local webcam.

    Parameters
    ----------
    device_index:
        OS camera index (0 for default camera).
    camera_id:
        Logical camera name.
    width / height / fps:
        Requested capture resolution / frame rate.  The OS will apply the
        nearest supported values.
    """

    source_type = "webcam"

    def __init__(
        self,
        device_index: int = 0,
        camera_id: str = "webcam",
        width: int = 1280,
        height: int = 720,
        fps: int = 30,
        **kwargs,
    ) -> None:
        super().__init__(camera_id=camera_id, **kwargs)
        self._device_index = device_index
        self._req_width = width
        self._req_height = height
        self._req_fps = fps

    def _open_capture(self) -> cv2.VideoCapture:
        cap = cv2.VideoCapture(self._device_index)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._req_width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._req_height)
        cap.set(cv2.CAP_PROP_FPS, self._req_fps)
        return cap


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def open_source(
    source: Union[str, int],
    camera_id: Optional[str] = None,
    **kwargs,
) -> VideoSource:
    """Factory that returns the appropriate VideoSource for a given input.

    Parameters
    ----------
    source:
        - ``int`` → :class:`WebcamSource` (device index)
        - ``str`` starting with ``"rtsp://"`` or ``"rtsps://"`` → :class:`RTSPSource`
        - Any other ``str`` → :class:`FileSource`
    camera_id:
        Optional override for the camera identifier.
    **kwargs:
        Forwarded to the underlying source constructor.

    Examples
    --------
    >>> src = open_source(0, camera_id="cam-main")                  # webcam
    >>> src = open_source("rtsp://10.0.0.1/live", camera_id="c1")  # RTSP
    >>> src = open_source("data/video.mp4", camera_id="c2")        # file
    """
    if isinstance(source, int):
        return WebcamSource(device_index=source, camera_id=camera_id or "webcam", **kwargs)

    if isinstance(source, str):
        lowered = source.lower()
        if lowered.startswith("rtsp://") or lowered.startswith("rtsps://"):
            return RTSPSource(url=source, camera_id=camera_id or "rtsp-cam", **kwargs)
        return FileSource(path=source, camera_id=camera_id, **kwargs)

    raise TypeError(f"Unsupported source type: {type(source).__name__!r}. Expected str or int.")
