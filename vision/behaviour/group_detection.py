from math import hypot


def clusters(centers: list[tuple[float, float]], radius: float = 80.0, min_size: int = 3) -> list[list[int]]:
    used = set()
    groups: list[list[int]] = []
    for i, origin in enumerate(centers):
        if i in used:
            continue
        group = [i]
        for j, other in enumerate(centers):
            if i == j or j in used:
                continue
            if hypot(origin[0] - other[0], origin[1] - other[1]) <= radius:
                group.append(j)
        if len(group) >= min_size:
            used.update(group)
            groups.append(group)
    return groups
