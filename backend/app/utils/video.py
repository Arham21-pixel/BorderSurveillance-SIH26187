from pathlib import Path

import cv2
import numpy as np


def open_source(source: str | int):
    return cv2.VideoCapture(int(source) if str(source).isdigit() else source)


def read_frame(capture) -> np.ndarray | None:
    ok, frame = capture.read()
    return frame if ok else None


def decode_bytes(payload: bytes) -> np.ndarray | None:
    array = np.frombuffer(payload, dtype=np.uint8)
    frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
    return frame


def write_image(path: str | Path, frame: np.ndarray) -> str:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), frame)
    return str(path)
