def classify(features: dict) -> str:
    if features.get("zone_restricted"):
        return "zone_intrusion"
    if float(features.get("dwell_seconds") or 0) >= 30:
        return "loitering"
    if int(features.get("group_size") or 1) >= 3:
        return "group"
    if features.get("vehicle_near_fence"):
        return "vehicle"
    return "motion"
