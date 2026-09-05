# Backend Notes

`backend.main:app` is the canonical API entrypoint.

This package is intentionally layered:

- `api/` for routing and transport
- `services/` for business orchestration
- `schemas/` for request/response contracts
- `core/` for config, logging, errors, and dependencies

The ingestion contract for external AI pipeline integrations is exposed via `/api/ingest/*` and is designed to be independent of any specific CV model implementation.
