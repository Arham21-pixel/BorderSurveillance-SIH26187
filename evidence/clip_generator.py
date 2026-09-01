from pathlib import Path

from evidence.snapshot_generator import save_snapshot


def write_clip(frames: list, path: str, fps: int = 12) -> str:
    if not frames:
        return path
    try:
        import cv2
    except ImportError:
        return path
    h, w = frames[0].shape[:2]
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    for frame in frames:
        writer.write(frame)
    writer.release()
    return path
