# BORDER AI SENTINEL — Vision Pipeline

> **Branch:** `feat/ai-pipeline`  
> **Owner:** Aaryan (AI / Computer Vision)  
> **Scope:** `/vision/` and `/evidence/` only

---

## What this package does

Converts CCTV/video frames into a **generic, typed tracking output** that the
Backend and Intelligence layers can consume without knowing anything about YOLO
or OpenCV internals.

```
Video Source (RTSP / MP4 / Webcam)
    │
    ▼
VideoSource.frames()          ← ingestion/video_source.py
    │
    ▼
PreprocessingPipeline.apply() ← preprocessing/enhancement.py
    │  (resize + optional low-light)
    ▼
Detector.detect()             ← detection/detector.py  (YOLO)
    │  → list[DetectionResult]
    ▼
TrackManager.update()         ← tracking/track_manager.py (ByteTrack-style)
    │  → list[TrackingResult]
    ▼
Serializer                    ← pipeline/serializer.py
    │  → Backend Integration Contract dict
    ▼
EvidenceEngine.generate()     ← evidence/generator/evidence_engine.py
       → EvidencePackage (snapshot, clip, trajectory map, metadata JSON)
```

---

## Quick Setup

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd BorderSurveillance-SIH26187

# 2. Create a Python 3.11 virtual environment
python -m venv .venv

# 3. Activate (Windows)
.venv\Scripts\activate

# 4. Install vision dependencies (CPU-only)
pip install -r vision/requirements-vision.txt
```

---

## Model Requirements

| Model | Use case | Download |
|-------|----------|---------|
| `yolov8n.pt` | Default — fast, CPU-friendly | Auto-downloaded by Ultralytics on first run |
| `yolov8s.pt` | Higher accuracy, still CPU-viable | Same |
| `yolov8m.pt` | High accuracy — needs decent hardware | Same |

Place custom `.pt` / `.onnx` weights in `vision/models/` and point
`VisionConfig(model_path="vision/models/yourmodel.pt")` to them.

---

## Sample Run Commands

### Process a local MP4 file

```bash
python - <<'EOF'
from vision import CVPipeline, VisionConfig, open_source
import json

config = VisionConfig(device="cpu", sample_every=3, imgsz=320)
pipeline = CVPipeline(config)

with open_source("data/sample.mp4", camera_id="cam-01") as src:
    for frame_data in src.frames(sample_every=3, max_frames=30):
        contract = pipeline.process_frame_data(frame_data)
        if contract["objects"]:
            print(json.dumps(contract, indent=2))
            break

print("Pipeline OK —", pipeline)
EOF
```

### Webcam (live)

```bash
python - <<'EOF'
from vision import CVPipeline, VisionConfig, open_source
import json

pipeline = CVPipeline(VisionConfig(sample_every=2))

with open_source(0, camera_id="webcam-main") as src:
    for frame_data in src.frames(max_frames=100):
        contract = pipeline.process_frame_data(frame_data)
        print(f"frame {frame_data.frame_index}: {len(contract['objects'])} objects")
EOF
```

### RTSP stream

```bash
python - <<'EOF'
from vision import CVPipeline, VisionConfig, open_source

pipeline = CVPipeline(VisionConfig(sample_every=2))

with open_source("rtsp://user:pass@192.168.1.10:554/live", camera_id="cam-border-01") as src:
    for frame_data in src.frames():
        contract = pipeline.process_frame_data(frame_data)
        print(contract)
EOF
```

### Generate evidence for an event

```bash
python - <<'EOF'
import cv2
from evidence.generator.evidence_engine import EvidenceEngine

frame = cv2.imread("data/test_frame.jpg")
tracked = [
    {
        "track_id": "T0001",
        "object_class": "person",
        "confidence": 0.88,
        "bounding_box": [100, 50, 300, 400],
        "trajectory": [[200, 225], [210, 230], [220, 235]],
    }
]

engine = EvidenceEngine(output_dir="evidence/events")
package = engine.generate(
    frame=frame,
    event_id="evt-20260903-001",
    camera_id="cam-01",
    tracked_objects=tracked,
    event_context={"zone": "sector-4", "alert_type": "intrusion"},
)
print(package)
EOF
```

---

## Backend Integration Contract

See `vision/integration_contract.py` for full documentation.

```json
{
    "camera_id": "cam-border-01",
    "timestamp": "2026-09-03T21:00:00Z",
    "frame_id": 123,
    "objects": [
        {
            "track_id": "T0001",
            "object_class": "person",
            "confidence": 0.91,
            "bounding_box": [120.5, 45.2, 310.8, 420.1],
            "trajectory": [[215.6, 232.6], [220.1, 235.0]],
            "movement_direction": "NE",
            "first_seen": "2026-09-03T21:00:00Z",
            "last_seen": "2026-09-03T21:00:05Z"
        }
    ]
}
```

`object_class` is always one of: `"person"`, `"vehicle"`, `"animal"`, `"other"`.

Validate incoming contracts with:
```python
from vision.integration_contract import validate_contract
errors = validate_contract(contract_dict)  # [] = valid
```

---

## Configuration

```python
from vision.pipeline.config import VisionConfig

config = VisionConfig(
    model_path="yolov8n.pt",   # YOLO weights
    confidence=0.40,            # Detection confidence threshold
    imgsz=640,                  # Inference resolution (must be multiple of 32)
    device="cpu",               # "cpu" | "cuda:0" | "mps"
    sample_every=2,             # Process every N-th frame
    preprocess_width=960,       # Resize before inference (None = no resize)
    low_light=False,            # CLAHE + gamma enhancement
    tracker_max_age=30,         # Frames before track is dropped
)
```

---

## Known Limitations

1. **ByteTrack implementation** is IoU-based (two-stage). For better
   re-identification across occlusions, integrate `supervision.ByteTrack` or
   a dedicated Re-ID module.
2. **RTSP reconnection** retries 3× by default. Long network outages will
   require a restart loop at the application level.
3. **No hardware acceleration** configured by default — `device="cpu"`.
   Enable CUDA by setting `device="cuda:0"` and installing the GPU torch build.
4. **ONNX / OpenVINO Optimization:** To achieve higher FPS and lower latency on CPU, you can export the YOLO model to ONNX or OpenVINO format (e.g. `yolo export model=yolov8n.pt format=onnx` or `format=openvino`) and simply pass the exported file/folder to the `--model` argument. The Ultralytics backend automatically detects the format and runs optimized CPU inference!
5. **Model download** requires internet access on first run (Ultralytics CDN).
   Pre-place weights in `vision/models/` for air-gapped environments.

---

## CPU / Performance Benchmarking

The `run_cv_pipeline.py` script automatically measures and outputs actual FPS, processing latency, and records the hardware node used at the end of execution. Do not invent performance numbers — rely on the pipeline's printed summary.

---

## What this package does NOT do

| Concern | Owner |
|---------|-------|
| Risk scoring / behaviour analysis | `/intelligence/` |
| Database writes | `/backend/` |
| Supabase upload | `/backend/` + `/supabase/` |
| FastAPI routes | `/backend/` |
| Frontend rendering | `/frontend/` |
| Alert dispatch / notifications | `/backend/` |
