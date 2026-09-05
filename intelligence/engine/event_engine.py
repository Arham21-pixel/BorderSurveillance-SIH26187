from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from intelligence.risk.risk_engine import RiskContext, RiskEngine, RiskResult


@dataclass(slots=True)
class EventRecord:
    event_id: str
    event_type: str
    risk_result: RiskResult
    context: dict


class EventEngine:
    def __init__(self, risk_engine: RiskEngine | None = None) -> None:
        self.risk_engine = risk_engine or RiskEngine()
        self._last_emitted: dict[str, datetime] = {}

    def should_emit(self, dedupe_key: str, timestamp: datetime, dedupe_seconds: int) -> bool:
        previous = self._last_emitted.get(dedupe_key)
        if previous and (timestamp - previous).total_seconds() < dedupe_seconds:
            return False
        self._last_emitted[dedupe_key] = timestamp
        return True

    def build_event(self, event_type: str, risk_context: RiskContext, context: dict) -> EventRecord:
        risk_result = self.risk_engine.evaluate(risk_context)
        return EventRecord(
            event_id=str(uuid4()),
            event_type=event_type,
            risk_result=risk_result,
            context=context,
        )
