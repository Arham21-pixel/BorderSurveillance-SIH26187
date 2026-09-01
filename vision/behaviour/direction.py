def heading(prev: tuple[float, float], curr: tuple[float, float]) -> str:
    dx = curr[0] - prev[0]
    dy = curr[1] - prev[1]
    if abs(dx) < 2 and abs(dy) < 2:
        return "stationary"
    if abs(dx) > abs(dy):
        return "east" if dx > 0 else "west"
    return "south" if dy > 0 else "north"
