"""Download the default YOLOv8n weights into vision/models/."""

from pathlib import Path


def main() -> None:
    target = Path("vision/models")
    target.mkdir(parents=True, exist_ok=True)
    try:
        from ultralytics import YOLO

        model = YOLO("yolov8n.pt")
        dest = target / "yolov8n.pt"
        if Path("yolov8n.pt").exists() and not dest.exists():
            Path("yolov8n.pt").replace(dest)
        print(f"Model ready: {dest if dest.exists() else 'yolov8n.pt (ultralytics cache)'}")
        _ = model
    except Exception as exc:
        print("Install dependencies first: pip install -r requirements.txt")
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
