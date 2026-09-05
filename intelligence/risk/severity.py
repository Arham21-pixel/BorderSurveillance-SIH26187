from enum import Enum


class Severity(str, Enum):
    NORMAL = "NORMAL"
    SUSPICIOUS = "SUSPICIOUS"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


def classify_severity(score: float) -> Severity:
    """
    Classify a 0-100 risk score into a severity band.

    PRD-001 / TRD-001 (v0.2 finalised):
        0-29   NORMAL
        30-59  SUSPICIOUS
        60-79  HIGH
        80-100 CRITICAL
    """
    if score >= 80:
        return Severity.CRITICAL
    if score >= 60:
        return Severity.HIGH
    if score >= 30:
        return Severity.SUSPICIOUS
    return Severity.NORMAL
