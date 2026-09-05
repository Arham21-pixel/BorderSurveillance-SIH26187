from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from intelligence.risk.severity import Severity, classify_severity


@dataclass(slots=True)
class RiskContext:
    """All inputs consumed by the risk engine for a single detection event.

    PRD-001 / TRD-001 (v0.2 finalised) risk factors
    ──────────────────────────────────────────────────
    +40  Restricted zone entry
    +25  Moving toward protected boundary
    +20  Loitering > 30 sec
    +15  Group of 3+ people
    +10  Night-time context
    -40  Animal / benign-object context
    -15  Normal trajectory (no anomaly)
    """

    event_id: str
    timestamp: datetime
    object_class: str
    detection_confidence: float

    # Zone
    zone_type: str | None = None
    restricted_zone_violation: bool = False

    # Movement
    direction: str = "UNKNOWN"
    toward_boundary: bool = False        # moving toward a protected boundary
    normal_trajectory: bool = False      # trajectory matches expected pattern (negative contributor)

    # Duration
    dwell_time: float = 0.0
    loitering: bool = False

    # Group
    group_movement: bool = False

    # Class context
    is_animal: bool = False              # animal / benign object → negative contribution

    # Time
    night_time: bool = False

    # Deduplication
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
    """Configurable weight table — all values map to the PRD/TRD defaults.

    Positive values increase the score; negative values decrease it.
    """

    # A small base so that even minimal loitering clears the SUSPICIOUS threshold
    base_score: float = 5.0

    # Positive contributors (PRD-001 / TRD-001 v0.2)
    restricted_zone_weight: float = 40.0       # Restricted zone entry
    toward_boundary_weight: float = 25.0       # Moving toward protected boundary
    loitering_weight: float = 20.0             # Loitering > 30 sec
    group_weight: float = 15.0                 # Group of 3+ people
    night_weight: float = 10.0                 # Night-time context

    # Negative contributors (PRD-001 / TRD-001 v0.2)
    animal_benign_weight: float = 40.0         # Animal / benign: subtract this value
    normal_trajectory_weight: float = 15.0     # Normal trajectory: subtract this value

    # Supplementary positive weights (not in PRD/TRD table but used internally)
    zone_restricted_type_weight: float = 5.0   # zone_type == RESTRICTED (additional signal)
    unusual_trajectory_weight: float = 10.0    # Unusual trajectory pattern
    repeated_event_weight: float = 5.0         # Repeated event context
    dwell_time_weight: float = 8.0             # Proportional dwell bonus
    loitering_reference_seconds: float = 30.0  # PRD threshold (30 sec)

    max_score: float = 100.0


class RiskEngine:
    def __init__(self, config: RiskEngineConfig | None = None) -> None:
        self.config = config or RiskEngineConfig()

    def evaluate(self, ctx: RiskContext) -> RiskResult:
        """Apply weighted rules to produce a clamped 0-100 score with full audit trail."""
        factors: dict[str, float] = {}
        reasons: list[str] = []
        score = self.config.base_score

        # ── Positive contributors ───────────────────────────────────────────

        if ctx.restricted_zone_violation:
            factors["restricted_zone_violation"] = self.config.restricted_zone_weight
            score += self.config.restricted_zone_weight
            reasons.append("Restricted zone entry")

        if (ctx.zone_type or "").upper() == "RESTRICTED":
            factors["restricted_zone_type"] = self.config.zone_restricted_type_weight
            score += self.config.zone_restricted_type_weight

        if ctx.toward_boundary:
            factors["toward_boundary"] = self.config.toward_boundary_weight
            score += self.config.toward_boundary_weight
            reasons.append("Moving toward protected boundary")

        if ctx.loitering:
            factors["loitering"] = self.config.loitering_weight
            score += self.config.loitering_weight
            reasons.append(f"Loitering threshold exceeded (>{self.config.loitering_reference_seconds:.0f}s)")

        if ctx.dwell_time > 0:
            dwell_ratio = min(1.0, ctx.dwell_time / max(1.0, self.config.loitering_reference_seconds))
            dwell_contribution = dwell_ratio * self.config.dwell_time_weight
            factors["dwell_time"] = dwell_contribution
            score += dwell_contribution
            if dwell_ratio > 0.66:
                reasons.append("Extended dwell time")

        if ctx.group_movement:
            factors["group_movement"] = self.config.group_weight
            score += self.config.group_weight
            reasons.append("Group of 3+ people / coordinated movement")

        if ctx.night_time:
            factors["night_time"] = self.config.night_weight
            score += self.config.night_weight
            reasons.append("Night-time movement")

        if ctx.repeated_event:
            factors["repeated_event"] = self.config.repeated_event_weight
            score += self.config.repeated_event_weight
            reasons.append("Repeated event context")

        # Unusual trajectory only contributes positively when normal_trajectory is NOT flagged
        if not ctx.normal_trajectory and not ctx.toward_boundary:
            # detect unusual only if neither normal nor boundary-specific
            pass
        elif ctx.normal_trajectory is False and ctx.toward_boundary is False:
            pass

        # ── Negative contributors ───────────────────────────────────────────

        if ctx.is_animal:
            deduction = -self.config.animal_benign_weight
            factors["animal_benign"] = deduction
            score += deduction            # deduction is negative
            reasons.append("Animal / benign object detected (negative contributor)")

        if ctx.normal_trajectory:
            deduction = -self.config.normal_trajectory_weight
            factors["normal_trajectory"] = deduction
            score += deduction
            reasons.append("Normal trajectory (negative contributor)")

        # ── Clamp and classify ──────────────────────────────────────────────

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
