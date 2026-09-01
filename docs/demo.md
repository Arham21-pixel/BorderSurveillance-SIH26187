# Demo script

## Goal

Show a jury a closed-loop path: video in → detection overlay → behaviour event → risk score → alert card → evidence snapshot.

## Path A — synthetic (no camera)

```bash
python scripts/generate_test_data.py
python scripts/run_demo.py
```

`run_demo.py` plays a generated or sample clip through the pipeline and prints scored events. The API also exposes `/api/analytics/summary` for the dashboard.

## Path B — live webcam

1. Set camera `source: 0` in `config/cameras.yaml`.
2. Start the API and frontend.
3. Open the Cameras page; detections overlay on the feed.
4. Walk through a restricted zone (see `config/zones.example.yaml`) or stand still to trigger loitering.

## What to narrate

1. Multi-object detect + track IDs stay stable.
2. Zone entry raises risk immediately.
3. Loitering accumulates over time (not a single-frame false alarm).
4. Group clustering increases score.
5. Operator must acknowledge a high alert — the system does not act on its own.

## Sample assets

Place clips in `data/sample_videos/` (gitignored). Keep jury clips short (20–40s) with clear subjects.
