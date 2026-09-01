from intelligence.risk_engine import score_event, severity_for


def evaluate(features: dict) -> dict:
    score = score_event(features)
    return {"score": score, "severity": severity_for(score)}
