"""Write a tiny synthetic JPEG used by local tests and demos."""

from pathlib import Path


def main() -> None:
    out = Path("data/test_images")
    out.mkdir(parents=True, exist_ok=True)
    try:
        import cv2
        import numpy as np

        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        cv2.rectangle(frame, (80, 60), (160, 280), (40, 180, 255), -1)
        cv2.imwrite(str(out / "person_stub.jpg"), frame)
        print(f"Wrote {out / 'person_stub.jpg'}")
    except Exception as exc:
        (out / "person_stub.txt").write_text("install opencv to generate images\n")
        print(exc)


if __name__ == "__main__":
    main()
