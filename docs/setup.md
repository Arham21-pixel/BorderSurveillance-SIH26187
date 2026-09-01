# Setup

## Prerequisites

- Python 3.11+
- Node.js 20+
- Optional: Docker Desktop, a Supabase project

## 1. Clone

```bash
git clone https://github.com/Arham21-pixel/BorderSurveillance-SIH26187.git
cd BorderSurveillance-SIH26187
```

## 2. Environment

```bash
copy .env.example .env
```

Edit `.env` with Supabase keys if you are using a live database. The API also runs with in-memory stores for local demos.

## 3. Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/download_model.py
```

## 4. Config

```bash
copy config\cameras.example.yaml config\cameras.yaml
copy config\zones.example.yaml config\zones.yaml
```

Point `source` in `cameras.yaml` at a webcam index (`0`) or a file under `data/sample_videos/`.

## 5. Run API + UI

```bash
uvicorn backend.app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

## 6. Supabase (optional)

Apply migrations in `supabase/migrations/` from the Supabase SQL editor, then run `supabase/seed.sql`.

See `supabase/README.md`.

## 7. Docker

```bash
docker compose up --build
```

## Tests

```bash
pytest backend/tests -q
```
