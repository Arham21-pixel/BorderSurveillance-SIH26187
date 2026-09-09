"""Run the five named clips through YOLO → ByteTrack → one episode each.

Usage (from repo root):
    python scripts/run_clip_scenarios.py

Put the files in data/videos/ (any of the listed aliases). Missing files are
reported; results are not invented.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from vision.pipeline.clip_analyze import analyze_clip_file, find_clip, infer_scenario

SCENARIOS: tuple[tuple[str, str, str], ...] = (
    ("walking.mp4", "CAM-05", "normal"),
    ("border crossing.mp4", "CAM-02", "zone_intrusion"),
    ("loitering.mp4", "CAM-01", "loitering"),
    ("group ppl moving.mp4", "CAM-03", "group"),
    ("animal video.mp4", "CAM-04", "animal"),
)


def _outcome(kind: str, expected: str) -> str:
    if expected == "normal":
        return "PASS" if kind == "normal" else "UNEXPECTED"
    if kind == expected:
        return "PASS"
    if kind == "normal":
        return "NO EVENT"
    return "MISMATCH"


def main() -> int:
    print("NETRA clip pipeline  (YOLO -> ByteTrack -> one episode)")
    print("Clips: data/videos/   (also data/, frontend/public/)")
    print()
    missing = 0
    errors = 0
    for filename, camera_id, expected in SCENARIOS:
        path = find_clip(filename)
        if path is None:
            missing += 1
            print(f"  {filename:<28} MISSING  put the file in data/videos/")
            continue
        inferred = infer_scenario(path.name)
        result = analyze_clip_file(path, camera_id, scenario=inferred)
        if result.error:
            errors += 1
            print(f"  {path.name:<28} ERROR    {result.error}")
            continue
        got = result.kind
        flag = _outcome(got, expected)
        extra = ""
        if expected == "loitering" and got == "normal" and result.duration_s < 30:
            extra = f"  (clip {result.duration_s:.1f}s; loitering needs 30s dwell)"
        elif expected == "normal" and got == "normal":
            extra = "  (no event, no alert)"
        elif expected == "animal" and got == "animal":
            extra = "  (event only, no alert)"
        elif got != "normal":
            extra = "  (one event -> one risk -> one alert)"
        print(
            f"  {path.name:<28} {flag:<10} expected={expected:<16} got={got:<16} "
            f"frames={result.frames}{extra}"
        )
    print()
    if missing:
        print(f"{missing} clip(s) not found. Copy them into {ROOT / 'data' / 'videos'}.")
    if errors:
        print("YOLO failed. Install ultralytics and run: python scripts/download_model.py")
        return 1
    return 0 if missing == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
