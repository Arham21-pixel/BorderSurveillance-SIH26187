import type { Detection } from "../types/detection";
import type { Alert } from "../types/alert";
import type { EventItem } from "../types/event";
import { SCENARIO_META, type DemoScenario } from "./demoScenarios";
import {
  bboxStraddlesFence,
  isMostlyVertical,
  lineSide,
  pointCrossedFence,
  resolveFence,
  type FenceLine,
} from "./fence";

export type CueKind = DemoScenario | "night";

const LOITER_MS = 30_000;
const GROUP_MIN = 3;
const GROUP_HOLD_MS = 900;

export function episodeKey(cameraId: string, kind: string, trackId?: number | string | null) {
  const normalized =
    kind === "border-crossing" || kind === "restricted_zone_entry"
      ? "restricted_zone_entry"
      : kind === "group-movement" || kind === "group_movement" || kind === "group"
        ? "group_movement"
        : kind === "animal" || kind === "animal_movement" || kind === "animal_detected"
          ? "animal"
          : kind === "night" || kind === "night_activity"
            ? "night_activity"
            : kind;
  if (normalized === "group_movement") return `${cameraId}:group_movement`;
  return `${cameraId}:${normalized}:${trackId ?? "na"}`;
}

export type BehaviorCue = {
  id: string;
  key: string;
  kind: CueKind;
  alert: Omit<Alert, "id" | "event_id" | "timestamp" | "status">;
  event: Omit<EventItem, "id" | "timestamp">;
};

type Sample = {
  t: number;
  x: number;
  y: number;
  footY: number;
  area: number;
  height: number;
};

type Track = {
  id: number;
  label: string;
  bbox: Detection["bbox"];
  confidence: number;
  lastT: number;
  samples: Sample[];
  stillSince: number | null;
  enteredSide: number | null;
};

export type AnalyzerFrame = {
  tracks: Detection[];
  cues: BehaviorCue[];
  threat: DemoScenario | null;
  inZone: boolean;
  night: boolean;
  activeKeys: string[];
};

function iou(a: Detection["bbox"], b: Detection["bbox"]) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const union = areaA + areaB - inter;
  return union <= 0 ? 0 : inter / union;
}

function center(bbox: Detection["bbox"]) {
  return { x: (bbox.x1 + bbox.x2) / 2, y: (bbox.y1 + bbox.y2) / 2 };
}

export function isInRestrictedZone(bbox: Detection["bbox"], fence: FenceLine | null = null) {
  const f = resolveFence(fence);
  return bboxStraddlesFence(bbox, f);
}

function samplesSince(samples: Sample[], now: number, windowMs: number) {
  const t0 = now - windowMs;
  return samples.filter((s) => s.t >= t0);
}

function isStill(window: Sample[]) {
  if (window.length < 4) return false;
  const xs = window.map((s) => s.x);
  const ys = window.map((s) => s.y);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const span = Math.max(...window.map((s) => Math.hypot(s.x - mx, s.y - my)));
  const areas = window.map((s) => s.area);
  const areaRatio = Math.max(...areas) / Math.max(0.0001, Math.min(...areas));
  const heights = window.map((s) => s.height);
  const heightRatio = Math.max(...heights) / Math.max(0.0001, Math.min(...heights));
  return span < 0.05 && areaRatio < 1.22 && heightRatio < 1.16;
}

function isMoving(window: Sample[]) {
  if (window.length < 3) return false;
  const first = window[0];
  const last = window[window.length - 1];
  const net = Math.hypot(last.x - first.x, last.y - first.y);
  const grew = last.area > first.area * 1.22 || last.height > first.height * 1.12;
  return net > 0.035 || grew;
}

function crossedFence(window: Sample[], fence: FenceLine) {
  if (window.length < 2) return false;
  for (let i = 1; i < window.length; i++) {
    const a = window[i - 1];
    const b = window[i];
    if (pointCrossedFence({ x: a.x, y: a.y }, { x: b.x, y: b.y }, fence)) return true;
    if (pointCrossedFence({ x: a.x, y: a.footY }, { x: b.x, y: b.footY }, fence)) return true;
  }
  const first = window[0];
  const last = window[window.length - 1];
  const net = Math.hypot(last.x - first.x, last.y - first.y);
  const climb = !isMostlyVertical(fence) && Math.abs(last.y - first.y) >= 0.05;
  if (net < 0.035 && !climb) return false;
  return (
    pointCrossedFence({ x: first.x, y: first.y }, { x: last.x, y: last.y }, fence) ||
    pointCrossedFence({ x: first.x, y: first.footY }, { x: last.x, y: last.footY }, fence)
  );
}

function crossedAnyFence(window: Sample[], fences: FenceLine[]) {
  return fences.some((fence) => crossedFence(window, fence));
}

function makeCue(
  cameraId: string,
  kind: DemoScenario,
  trackId: number,
  extra: string,
): BehaviorCue {
  const meta = SCENARIO_META[kind];
  const payloads: Record<DemoScenario, Omit<BehaviorCue, "id" | "kind" | "key">> = {
    loitering: {
      alert: {
        camera_id: cameraId,
        severity: "SUSPICIOUS",
        title: "Loitering detected",
        description: `Track ${trackId} stayed in the same location beyond the dwell threshold.`,
        risk_score: 0.46,
        reason: "+20 Loitering / dwell time",
        event_type: "loitering",
        track_id: trackId,
        zone: meta.zone,
        trajectory: extra,
        evidence_path: `live://${cameraId}/loitering`,
        object_class: "person",
        risk_breakdown: [{ signal: "Loitering", delta: 20 }],
      },
      event: {
        camera_id: cameraId,
        track_id: trackId,
        kind: "loitering",
        description: `Dwell time exceeded for track ${trackId}.`,
        risk_score: 0.46,
        zone: meta.zone,
        evidence_path: `live://${cameraId}/loitering`,
      },
    },
    "border-crossing": {
      alert: {
        camera_id: cameraId,
        severity: "HIGH",
        title: "Boundary crossing detected",
        description: `Track ${trackId} entered the restricted zone / crossed the monitored boundary.`,
        risk_score: 0.72,
        reason: "+40 Restricted-zone entry",
        event_type: "restricted_zone_entry",
        track_id: trackId,
        zone: meta.zone,
        trajectory: extra,
        evidence_path: `live://${cameraId}/boundary`,
        object_class: "person",
        risk_breakdown: [{ signal: "Restricted-zone entry", delta: 40 }],
      },
      event: {
        camera_id: cameraId,
        track_id: trackId,
        kind: "restricted_zone_entry",
        description: `Restricted-zone entry detected for track ${trackId}.`,
        risk_score: 0.72,
        zone: meta.zone,
        evidence_path: `live://${cameraId}/boundary`,
      },
    },
    "group-movement": {
      alert: {
        camera_id: cameraId,
        severity: "SUSPICIOUS",
        title: "Group walking detected",
        description: extra,
        risk_score: 0.38,
        reason: "+15 Group movement",
        event_type: "group_movement",
        track_id: trackId,
        zone: meta.zone,
        trajectory: extra,
        evidence_path: `live://${cameraId}/group`,
        object_class: "person",
        risk_breakdown: [{ signal: "Group movement", delta: 15 }],
      },
      event: {
        camera_id: cameraId,
        track_id: trackId,
        kind: "group_movement",
        description: extra,
        risk_score: 0.38,
        zone: meta.zone,
        evidence_path: `live://${cameraId}/group`,
      },
    },
    animal: {
      alert: {
        camera_id: cameraId,
        severity: "NORMAL",
        title: "Animal detected",
        description: `Non-human object classified as animal (track ${trackId}).`,
        risk_score: 0.18,
        reason: "Animal class — logged for operator review",
        event_type: "animal_detected",
        track_id: trackId,
        zone: meta.zone,
        trajectory: extra,
        evidence_path: `live://${cameraId}/animal`,
        object_class: "animal",
        risk_breakdown: [{ signal: "Non-human class", delta: -10 }],
      },
      event: {
        camera_id: cameraId,
        track_id: trackId,
        kind: "animal_detected",
        description: `Animal track ${trackId} observed.`,
        risk_score: 0.18,
        zone: meta.zone,
        evidence_path: `live://${cameraId}/animal`,
      },
    },
    night: {
      alert: {
        camera_id: cameraId,
        severity: "SUSPICIOUS",
        title: "Night / low-light activity",
        description: `Motion in a low-luminance scene (track ${trackId}).`,
        risk_score: 0.34,
        reason: "+10 Night-time / low-light context",
        event_type: "night_activity",
        track_id: trackId,
        zone: meta.zone,
        trajectory: extra,
        evidence_path: `live://${cameraId}/night`,
        object_class: "person",
        night: true,
        risk_breakdown: [{ signal: "Night-time / low-light", delta: 10 }],
      },
      event: {
        camera_id: cameraId,
        track_id: trackId,
        kind: "night_activity",
        description: `Low-light activity on track ${trackId}.`,
        risk_score: 0.34,
        zone: meta.zone,
        evidence_path: `live://${cameraId}/night`,
      },
    },
  };
  const key = episodeKey(cameraId, kind, kind === "group-movement" ? null : trackId);
  return { id: kind, key, kind, ...payloads[kind] };
}

export class CameraAnalyzer {
  private tracks: Track[] = [];
  private nextId = 1;
  private open = new Set<string>();
  private groupSince: number | null = null;
  private cameraId: string;
  private fence: FenceLine = resolveFence(null);

  constructor(cameraId: string) {
    this.cameraId = cameraId;
  }

  reset() {
    this.tracks = [];
    this.nextId = 1;
    this.open.clear();
    this.groupSince = null;
  }

  pathFor(trackId: number): { x: number; y: number }[] {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return [];
    return track.samples.map((s) => ({ x: s.x, y: s.y }));
  }

  update(raw: Detection[], now: number, scene?: { night?: boolean; fence?: FenceLine | null; fences?: FenceLine[] }): AnalyzerFrame {
    let fenceList: FenceLine[] = this.fence ? [this.fence] : [];
    if (scene && "fences" in scene && scene.fences && scene.fences.length) {
      fenceList = scene.fences.map((f) => resolveFence(f));
      this.fence = fenceList[0];
    } else if (scene && "fence" in scene) {
      const fence = scene.fence ? resolveFence(scene.fence) : null;
      if (fence) this.fence = fence;
      fenceList = fence ? [fence] : [];
    }
    this.matchTracks(raw, now);
    this.tracks = this.tracks.filter((tr) => now - tr.lastT < 2800);

    const cues: BehaviorCue[] = [];
    const persons = this.tracks.filter((t) => t.label === "person");
    const animals = this.tracks.filter((t) => t.label === "animal");
    const anyoneInZone = fenceList.length
      ? this.tracks.some((t) => t.label === "person" && fenceList.some((f) => bboxStraddlesFence(t.bbox, f)))
      : false;

    if (persons.length >= GROUP_MIN) {
      if (this.groupSince == null) this.groupSince = now;
    } else {
      this.groupSince = null;
    }

    const night = Boolean(scene?.night);
    let movingAnimal: Track | null = null;
    for (const track of animals) {
      const short = samplesSince(track.samples, now, 1800);
      if (isMoving(short)) movingAnimal = track;
    }

    const groupReady = this.groupSince != null && now - this.groupSince >= GROUP_HOLD_MS;
    const animalTracks = animals.filter((t) => now - t.samples[0].t >= 700);

    const crossingTracks: Track[] = [];
    const loiterTracks: Track[] = [];

    for (const track of this.tracks) {
      const window = samplesSince(track.samples, now, 5000);
      const short = samplesSince(track.samples, now, 2200);
      const c = center(track.bbox);
      const primary = fenceList[0];
      const side = primary ? Math.sign(lineSide(c.x, c.y, primary)) : 0;

      if (track.label === "person" && fenceList.length) {
        const pathCross = crossedAnyFence(window, fenceList);
        if (pathCross) {
          track.enteredSide = side !== 0 ? side : track.enteredSide ?? 1;
          crossingTracks.push(track);
        } else if (track.enteredSide != null) {
          const stillInside = fenceList.some(
            (f) => bboxStraddlesFence(track.bbox, f) || (side !== 0 && side === track.enteredSide),
          );
          if (stillInside) crossingTracks.push(track);
          else track.enteredSide = null;
        }
      }

      if (track.label === "person") {
        if (isMoving(short)) track.stillSince = null;
        else if (track.stillSince == null && (isStill(short) || track.samples.length >= 8)) {
          track.stillSince = now;
        }
      }
      if (
        track.label === "person" &&
        track.stillSince != null &&
        now - track.stillSince >= LOITER_MS &&
        !crossingTracks.some((t) => t.id === track.id)
      ) {
        loiterTracks.push(track);
      }
    }

    const desired = new Set<string>();

    for (const animal of animalTracks) {
      desired.add(episodeKey(this.cameraId, "animal", animal.id));
      this.pushCue(
        cues,
        "animal",
        animal,
        movingAnimal?.id === animal.id
          ? `Animal movement tracked (ID ${animal.id}).`
          : "Animal class from on-device detector.",
      );
      if (movingAnimal?.id === animal.id) {
        const last = cues[cues.length - 1];
        if (last?.kind === "animal") {
          last.alert.title = "Animal movement detected";
          last.alert.event_type = "animal_movement";
          last.alert.severity = "NORMAL";
          last.alert.risk_score = 0.18;
          last.event.kind = "animal_movement";
          last.event.description = last.alert.description;
        }
      }
    }

    if (groupReady) {
      desired.add(episodeKey(this.cameraId, "group-movement"));
      this.pushCue(
        cues,
        "group-movement",
        persons[0],
        `${persons.length} people moving together in view.`,
      );
    }

    for (const track of crossingTracks) {
      desired.add(episodeKey(this.cameraId, "border-crossing", track.id));
      this.pushCue(
        cues,
        "border-crossing",
        track,
        "Track crossed the monitored fence / restricted boundary.",
      );
    }

    for (const track of loiterTracks) {
      desired.add(episodeKey(this.cameraId, "loitering", track.id));
      this.pushCue(cues, "loitering", track, "Low displacement over 30s dwell window.");
    }

    this.open = desired;

    if (night) {
      for (const cue of cues) {
        if (cue.kind === "animal") continue;
        cue.alert.night = true;
        cue.alert.reason = `${cue.alert.reason ?? ""}, +10 Night-time / low-light`.replace(/^, /, "");
        cue.alert.risk_score = Math.min(1, (cue.alert.risk_score ?? 0) + 0.1);
        cue.alert.risk_breakdown = [
          ...(cue.alert.risk_breakdown ?? []),
          { signal: "Night-time / low-light", delta: 10 },
        ];
      }
    }

    const threat: DemoScenario | null = crossingTracks.length
      ? "border-crossing"
      : animalTracks.length
        ? "animal"
        : groupReady
          ? "group-movement"
          : loiterTracks.length
            ? "loitering"
            : null;

    const tracks: Detection[] = this.tracks.map((t) => ({
      track_id: t.id,
      label: t.label,
      confidence: t.confidence,
      bbox: t.bbox,
    }));

    return { tracks, cues, threat, inZone: anyoneInZone, night, activeKeys: [...desired] };
  }

  private pushCue(cues: BehaviorCue[], kind: DemoScenario, track: Track, extra: string) {
    const key = episodeKey(this.cameraId, kind, kind === "group-movement" ? null : track.id);
    if (this.open.has(key)) return;
    this.open.add(key);
    const cue = makeCue(this.cameraId, kind, track.id, extra);
    cue.key = key;
    if (kind === "animal") {
      cue.alert.severity = "NORMAL";
      cue.alert.risk_score = Math.min(cue.alert.risk_score ?? 0.18, 0.22);
    }
    cues.push(cue);
  }

  private matchTracks(raw: Detection[], now: number) {
    const used = new Set<number>();
    for (const det of raw) {
      let best: Track | null = null;
      let bestScore = 0.22;
      for (const track of this.tracks) {
        if (used.has(track.id)) continue;
        if (track.label !== det.label) continue;
        const score = iou(track.bbox, det.bbox);
        const c1 = center(track.bbox);
        const c2 = center(det.bbox);
        const dist = 1 - Math.min(1, Math.hypot(c1.x - c2.x, c1.y - c2.y) / 0.25);
        const combined = Math.max(score, dist * 0.85);
        if (combined > bestScore) {
          bestScore = combined;
          best = track;
        }
      }
      if (best) {
        used.add(best.id);
        this.touch(best, det, now);
      } else {
        const track: Track = {
          id: this.nextId++,
          label: det.label,
          bbox: det.bbox,
          confidence: det.confidence,
          lastT: now,
          samples: [],
          stillSince: null,
          enteredSide: null,
        };
        this.touch(track, det, now);
        this.tracks.push(track);
        used.add(track.id);
      }
    }
  }

  private touch(track: Track, det: Detection, now: number) {
    if (track.samples.length > 0) {
      const a = 0.38;
      track.bbox = {
        x1: track.bbox.x1 * (1 - a) + det.bbox.x1 * a,
        y1: track.bbox.y1 * (1 - a) + det.bbox.y1 * a,
        x2: track.bbox.x2 * (1 - a) + det.bbox.x2 * a,
        y2: track.bbox.y2 * (1 - a) + det.bbox.y2 * a,
      };
    } else {
      track.bbox = det.bbox;
    }
    track.confidence = det.confidence;
    track.label = det.label;
    track.lastT = now;
    const c = center(track.bbox);
    const area = Math.max(0.0001, (track.bbox.x2 - track.bbox.x1) * (track.bbox.y2 - track.bbox.y1));
    track.samples.push({
      t: now,
      x: c.x,
      y: c.y,
      footY: track.bbox.y2,
      area,
      height: Math.max(0.0001, track.bbox.y2 - track.bbox.y1),
    });
    if (track.samples.length > 80) track.samples.splice(0, track.samples.length - 80);
  }
}

const analyzers = new Map<string, CameraAnalyzer>();

export function analyzeCamera(
  cameraId: string,
  detections: Detection[],
  now: number,
  scene?: { night?: boolean; fence?: FenceLine | null; fences?: FenceLine[] },
): AnalyzerFrame {
  let analyzer = analyzers.get(cameraId);
  if (!analyzer) {
    analyzer = new CameraAnalyzer(cameraId);
    analyzers.set(cameraId, analyzer);
  }
  return analyzer.update(detections, now, scene);
}

export function getTrackPath(cameraId: string, trackId?: number | null): { x: number; y: number }[] {
  if (trackId == null) return [];
  return analyzers.get(cameraId)?.pathFor(trackId) ?? [];
}

export function resetCameraAnalyzer(cameraId: string) {
  analyzers.get(cameraId)?.reset();
}
