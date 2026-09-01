# HTTP API

Base URL (dev): `http://localhost:8000`

Interactive docs: `/docs` (Swagger) and `/redoc`.

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/health/ready` | Dependencies ready |

## Cameras

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/cameras` | List cameras |
| GET | `/api/cameras/{camera_id}` | Camera detail |
| POST | `/api/cameras` | Register camera |
| PATCH | `/api/cameras/{camera_id}` | Update camera |
| GET | `/api/cameras/{camera_id}/status` | Online / last frame |

## Detections

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/detections` | Recent detections |
| GET | `/api/detections/{camera_id}` | Detections for one camera |
| POST | `/api/detections/infer` | Run inference on an uploaded frame |

## Events

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/events` | Behaviour / risk events |
| GET | `/api/events/{event_id}` | Event detail |

## Alerts

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/alerts` | Alert queue (`?severity=&status=`) |
| GET | `/api/alerts/{alert_id}` | Alert + evidence refs |
| POST | `/api/alerts/{alert_id}/ack` | Operator acknowledgement |

## Analytics

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/analytics/summary` | Counts by severity / camera / hour |

## WebSocket

`ws://localhost:8000/ws`

Messages (JSON):

```json
{ "type": "alert", "payload": { "id": "...", "severity": "high" } }
{ "type": "detection", "payload": { "camera_id": "cam-01", "tracks": [] } }
{ "type": "heartbeat", "ts": "2026-09-01T17:00:00Z" }
```
