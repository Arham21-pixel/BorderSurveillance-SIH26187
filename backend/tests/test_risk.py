from intelligence.risk_engine import score_event, severity_for


def test_restricted_zone_is_high_risk():
    score = score_event({"zone_restricted": True, "dwell_seconds": 5, "group_size": 1})
    assert score >= 0.75
    assert severity_for(score) == "high"


def test_benign_passage_is_low():
    score = score_event({"zone_restricted": False, "dwell_seconds": 2, "group_size": 1})
    assert severity_for(score) == "low"
