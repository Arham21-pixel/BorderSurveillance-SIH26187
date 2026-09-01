def apply_rules(features: dict) -> float:
    score = 0.1
    if features.get("zone_restricted"):
        score += 0.7
    dwell = float(features.get("dwell_seconds") or 0)
    if dwell >= 30:
        score += 0.25
    elif dwell >= 12:
        score += 0.1
    group_size = int(features.get("group_size") or 1)
    if group_size >= 3:
        score += 0.2
    if features.get("night") and features.get("zone_restricted"):
        score += 0.1
    if features.get("vehicle_near_fence"):
        score += 0.35
    return score
