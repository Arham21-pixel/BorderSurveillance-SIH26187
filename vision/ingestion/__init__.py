"""
vision/ingestion — video source abstraction sub-package.

Public API
----------
VideoSource  : Abstract base class for all video sources.
FileSource   : Reads from an MP4 / AVI / MKV file.
RTSPSource   : Reads from an RTSP network stream.
WebcamSource : Reads from a local webcam device.
FrameData    : Named tuple holding a frame + metadata.
open_source  : Factory that selects the right source from a URL/path string.
"""

from vision.ingestion.video_source import (
    FrameData,
    FileSource,
    RTSPSource,
    VideoSource,
    WebcamSource,
    open_source,
)

__all__ = [
    "VideoSource",
    "FileSource",
    "RTSPSource",
    "WebcamSource",
    "FrameData",
    "open_source",
]
