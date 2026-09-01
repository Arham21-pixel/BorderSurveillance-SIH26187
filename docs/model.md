# Detection model

Default local model: **YOLOv8n** (`vision/models/yolov8n.pt`).

Nano is intentional for SIH demos — it runs on CPU laptops. Swap the weights path in `.env` (`DETECTION_MODEL_PATH`) for a larger checkpoint when a GPU is available.

## Classes

See `vision/detection/classes.py`. The pipeline treats these as first-class:

- `person`
- `bicycle`, `motorcycle`, `car`, `truck`, `bus`

Other COCO classes are ignored by the risk engine.

## Download

```bash
python scripts/download_model.py
```

Weights are **not** committed. They are fetched on first run or via the script.

## Inference notes

- Confidence default: `0.45` (`DETECTION_CONFIDENCE`).
- Device: `cpu` or `cuda` (`DETECTION_DEVICE`).
- Tracker: IoU + centroid association with configurable `max_age`.
- Low-light: CLAHE + gamma in `vision/preprocessing/low_light.py`.

## Benchmark

```bash
python scripts/benchmark.py
```

Report FPS, latency p50/p95, and detections per frame on `data/sample_videos/` or a generated synthetic clip.
