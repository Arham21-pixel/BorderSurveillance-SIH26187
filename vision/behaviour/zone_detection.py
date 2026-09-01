from backend.app.utils.geometry import point_in_polygon


def in_restricted_zone(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    if not polygon:
        return False
    return point_in_polygon(point, polygon)
