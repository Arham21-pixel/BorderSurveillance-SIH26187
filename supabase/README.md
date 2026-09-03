# Supabase Schema

This folder contains SQL migrations and demo seed data for Border AI Sentinel.

## Tables

- `users`
- `cameras`
- `zones`
- `detections`
- `tracks`
- `behaviour_events`
- `risk_scores`
- `alerts`
- `evidence`
- `system_events`

All tables include timezone-aware timestamps, foreign keys, constraints, indexes, and row-level security policies.

## Apply migrations

```bash
supabase db push
```

## Seed demo records

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```
