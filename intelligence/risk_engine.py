from intelligence.risk_rules import apply_rules
from intelligence.thresholds import HIGH, MEDIUM


def score_event(features: dict) -> float:
    return round(min(1.0, max(0.0, apply_rules(features))), 3)


def severity_for(score: float) -> str:
    if score >= HIGH:
        return "high"
    if score >= MEDIUM:
        return "medium"
    return "low"
