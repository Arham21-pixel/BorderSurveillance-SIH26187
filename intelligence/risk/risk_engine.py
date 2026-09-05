from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from intelligence.risk.severity import Severity, classify_severity


@dataclass(slots=True)
class RiskContext:
    event_id: str
    timestamp: datetime
    object_class: str
    detection_confidence: float
    zone_type: str | None = None
    restricted_zone_violation: bool = False
    direction: str = "UNKNOWN"
    dwell_time: float = 0.0
    loitering: bool = False
    group_movement: bool = False
    unusual_trajectory: bool = False
    night_time: bool = False
    repeated_event: bool = False


@dataclass(slots=True)
class RiskResult:
    event_id: str
    score: float
    severity: str
    reasons: list[str]
    contributing_factors: dict[str, float]
    timestamp: datetime


@dataclass(slots=True)
class RiskEngineConfig:
    base_score: float = 5.0
    restricted_zone_weight: float = 30.0
    zone_restricted_type_weight: float = 10.0
    confidence_weight: float = 20.0
    loitering_weight: float = 18.0
    dwell_time_weight: float = 10.0
    group_weight: float = 10.0
    unusual_trajectory_weight: float = 14.0
    night_weight: float = 8.0
    repeated_event_weight: float = 5.0
    max_score: float = 100.0
    loitering_reference_seconds: float = 90.0


class RiskEngine:
    def __init__(self, config: RiskEngineConfig | None = None) -> None:
        self.config = config or RiskEngineConfig()

    def evaluate(self, ctx: RiskContext) -> RiskResult:
        factors: dict[str, float] = {"base_score": self.config.base_score}
        reasons: list[str] = []
        score = self.config.base_score

        confidence_contribution = max(0.0, min(1.0, ctx.detection_confidence)) * self.config.confidence_weight
        factors["detection_confidence"] = confidence_contribution
        score += confidence_contribution

        if ctx.restricted_zone_violation:
            factors["restricted_zone_violation"] = self.config.restricted_zone_weight
            score += self.config.restricted_zone_weight
            reasons.append("Restricted zone entry")

        if (ctx.zone_type or "").upper() == "RESTRICTED":
            factors["restricted_zone_type"] = self.config.zone_restricted_type_weight
            score += self.config.zone_restricted_type_weight

        if ctx.loitering:
            factors["loitering"] = self.config.loitering_weight
            score += self.config.loitering_weight
            reasons.append("Loitering threshold exceeded")

        if ctx.dwell_time > 0:
            dwell_ratio = min(1.0, ctx.dwell_time / self.config.loitering_reference_seconds)
            dwell_contribution = dwell_ratio * self.config.dwell_time_weight
            factors["dwell_time"] = dwell_contribution
            score += dwell_contribution
            if dwell_ratio > 0.66:
                reasons.append("Extended dwell time")

        if ctx.group_movement:
            factors["group_movement"] = self.config.group_weight
            score += self.config.group_weight
            reasons.append("Grouped movement detected")

        if ctx.unusual_trajectory:
            factors["unusual_trajectory"] = self.config.unusual_trajectory_weight
            score += self.config.unusual_trajectory_weight
            reasons.append("Unusual trajectory pattern")

        if ctx.night_time:
            factors["night_time"] = self.config.night_weight
            score += self.config.night_weight
            reasons.append("Night-time movement")

        if ctx.repeated_event:
            factors["repeated_event"] = self.config.repeated_event_weight
            score += self.config.repeated_event_weight
            reasons.append("Repeated event context")

        score = max(0.0, min(self.config.max_score, round(score, 2)))
        severity: Severity = classify_severity(score)
        return RiskResult(
            event_id=ctx.event_id,
            score=score,
            severity=severity.value,
            reasons=reasons,
            contributing_factors=factors,
            timestamp=ctx.timestamp,
        )
