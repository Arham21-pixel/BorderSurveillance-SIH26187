# Architecture

Border AI Sentinel is a layered surveillance pipeline: ingest → perceive → interpret → alert → review.

## System context

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Cameras /   │────▶│ Vision pipeline  │────▶│ Intelligence    │
│ sample feed │     │ detect + track   │     │ risk + classify │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────┐
                       ▼                              ▼              ▼
                ┌────────────┐               ┌─────────────┐  ┌───────────┐
                │ FastAPI    │◀──WebSocket──▶│ Dashboard   │  │ Supabase  │
                │ REST + WS  │               │ React / Vite│  │ events    │
                └─────┬──────┘               └─────────────┘  └───────────┘
                      │
                      ▼
                ┌────────────┐
                │ Evidence   │
                │ clips      │
                └────────────┘
```

## Backend services

| Service | Responsibility |
| --- | --- |
| `camera_service` | Camera registry, health, stream URLs |
| `detection_service` | Frame inference via `vision/detection` |
| `tracking_service` | Persistent track IDs across frames |
| `behaviour_service` | Zones, loitering, direction, groups |
| `risk_service` | Score events using `intelligence/` |
| `alert_service` | Deduplicate, persist, broadcast alerts |
| `evidence_service` | Snapshots and short clips |

## Data flow (one frame)

1. Frame is read from a camera or file (`utils/video.py`).
2. Optional low-light enhancement.
3. Detector returns boxes + class + confidence.
4. Tracker assigns `track_id`.
5. Behaviour modules emit candidate events.
6. Risk engine scores the event (0–1) and maps to high / medium / low.
7. If above threshold, alert + evidence package is created.
8. Dashboard receives the alert over WebSocket.

## Storage

Postgres (Supabase) holds cameras, events, and alerts. Binary evidence stays on disk (or object storage later). Realtime fan-out uses the API WebSocket, not the database.

## Safety constraints

- No autonomous response loop.
- All high-risk alerts require operator acknowledgement.
- Models are local; no third-party inference of live border video.
