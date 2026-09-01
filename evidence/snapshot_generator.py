from pathlib import Path


def save_snapshot(frame, path: str) -> str:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    try:
        import cv2

        cv2.imwrite(path, frame)
    except Exception:
        Path(path).write_bytes(b"")
    return path
