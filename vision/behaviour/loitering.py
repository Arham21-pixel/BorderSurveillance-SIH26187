def is_loitering(dwell_seconds: float, threshold: float = 30.0) -> bool:
    return dwell_seconds >= threshold
