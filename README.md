# Border AI Sentinel

**Smart India Hackathon 2026 — Problem Statement SIH26187**

AI-assisted border surveillance for multi-camera detection, tracking, behaviour analysis, risk scoring, and operator alerting.

[![Backend CI](https://github.com/Arham21-pixel/BorderSurveillance-SIH26187/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Arham21-pixel/BorderSurveillance-SIH26187/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Arham21-pixel/BorderSurveillance-SIH26187/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Arham21-pixel/BorderSurveillance-SIH26187/actions/workflows/frontend-ci.yml)

## What it does

| Layer | Capability |
| --- | --- |
| Vision | Person / vehicle detection, multi-object tracking, low-light enhancement |
| Behaviour | Restricted-zone entry, loitering, direction of travel, grouping |
| Intelligence | Rule-based risk engine with high / medium / low scoring |
| Evidence | Snapshot + clip packaging for each alert |
| Operations | Live dashboard, alert queue, camera map, analytics |

This is an **operator aid**, not an autonomous weapon or targeting system. Alerts require human review.

## Architecture

```
Cameras / sample video
        │
        ▼
  Vision pipeline (detect → track → behaviour)
        │
        ▼
  Risk engine → Alert service → Evidence package
        │
        ├── REST + WebSocket API
        ├── Operator dashboard
        └── Supabase (cameras, events, alerts)
```

See [docs/architecture.md](docs/architecture.md) for the full design.

## Quick start

```bash
# 1. Python env
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt

# 2. Config
copy .env.example .env

# 3. Optional: download a detection model
python scripts/download_model.py

# 4. API
uvicorn backend.app.main:app --reload --port 8000

# 5. Dashboard (second terminal)
cd frontend
npm install
npm run dev
```

API docs: http://localhost:8000/docs  
Dashboard: http://localhost:5173

Full setup: [docs/setup.md](docs/setup.md)

## Repository layout

```
backend/        FastAPI services, schemas, tests
vision/          Detection, tracking, preprocessing, behaviour
intelligence/    Risk scoring and event classification
evidence/        Clip / snapshot packaging
frontend/        React + Vite operator console
supabase/        Schema migrations and seed data
config/          Camera, zone, and risk-rule YAML
docs/            Architecture, API, model, demo notes
scripts/         Demo, benchmark, model download
```

## Demo

```bash
python scripts/run_demo.py
```

Details: [docs/demo.md](docs/demo.md)

## License

MIT — see [LICENSE](LICENSE).
