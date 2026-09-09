import type { Detection } from "../types/detection";
import type { Alert } from "../types/alert";
import type { EventItem } from "../types/event";
import { SCENARIO_META, type DemoScenario } from "./demoScenarios";
import {
  bboxStraddlesFence,
  isMostlyVertical,
  pointCrossedFence,
  resolveFence,
  type FenceLine,
} from "./fence";

export type CueKind = DemoScenario | "night";

export type BehaviorCue = {
  id: string;
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
};

export type AnalyzerFrame = {
  tracks: Detection[];
  cues: BehaviorCue[];
  threat: DemoScenario | null;
  inZone: boolean;
  night: boolean;
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
  if (net < 0.04) return false;
  return (
    pointCrossedFence({ x: first.x, y: first.y }, { x: last.x, y: last.y }, fence) ||
    pointCrossedFence({ x: first.x, y: first.footY }, { x: last.x, y: last.footY }, fence)
  );
}

function makeCue(
  cameraId: string,
  kind: DemoScenario,
  trackId: number,
  extra: string,
): BehaviorCue {
  const meta = SCENARIO_META[kind];
  const payloads: Record<DemoScenario, Omit<BehaviorCue, "id" | "kind">> = {
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
  return { id: kind, kind, ...payloads[kind] };
}

function makeNightCue(cameraId: string, trackId: number): BehaviorCue {
  return {
    id: "night",
    kind: "night",
    alert: {
      camera_id: cameraId,
      severity: "SUSPICIOUS",
      title: "Night / low-light activity",
      description: `Motion in a low-luminance scene (track ${trackId}). Night-time context applied.`,
      risk_score: 0.34,
      reason: "+10 Night-time / low-light context",
      event_type: "night_activity",
      track_id: trackId,
      zone: "Low-light sector",
      trajectory: "Activity under low illumination.",
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
      zone: "Low-light sector",
      evidence_path: `live://${cameraId}/night`,
    },
  };
}

export class CameraAnalyzer {
  private tracks: Track[] = [];
  private nextId = 1;
  private lastFire = new Map<CueKind, number>();
  private groupSince: number | null = null;
  private cameraId: string;
  private fence: FenceLine = resolveFence(null);

  constructor(cameraId: string) {
    this.cameraId = cameraId;
  }

  reset() {
    this.tracks = [];
    this.nextId = 1;
    this.lastFire.clear();
    this.groupSince = null;
  }

  pathFor(trackId: number): { x: number; y: number }[] {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return [];
    return track.samples.map((s) => ({ x: s.x, y: s.y }));
  }

  update(raw: Detection[], now: number, scene?: { night?: boolean; fence?: FenceLine | null }): AnalyzerFrame {
    if (scene && "fence" in scene) this.fence = resolveFence(scene.fence);
    this.matchTracks(raw, now);
    this.tracks = this.tracks.filter((tr) => now - tr.lastT < 2800);

    const cues: BehaviorCue[] = [];
    const persons = this.tracks.filter((t) => t.label === "person");
    const animals = this.tracks.filter((t) => t.label === "animal");
    const fence = this.fence;
    const anyoneInZone = this.tracks.some((t) => t.label === "person" && bboxStraddlesFence(t.bbox, fence));

    if (persons.length >= 2) {
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

    const groupReady = this.groupSince != null && now - this.groupSince >= 900;
    const animalReady = animals.some((t) => now - t.samples[0].t >= 700);

    let crossingTrack: Track | null = null;
    let loiterTrack: Track | null = null;

    for (const track of this.tracks) {
      const window = samplesSince(track.samples, now, 5000);
      const short = samplesSince(track.samples, now, 2200);
      if (track.label === "person") {
        const pathCross = crossedFence(window, fence);
        const onFenceMoving =
          isMostlyVertical(fence) && bboxStraddlesFence(track.bbox, fence) && isMoving(short);
        if (pathCross || onFenceMoving) crossingTrack = track;
      }
      if (track.label === "person" && window.length && now - window[0].t >= 3200 && isStill(window)) {
        loiterTrack = track;
      }
    }

    if (animalReady) {
      const animal = movingAnimal ?? animals[0];
      this.pushCue(
        cues,
        "animal",
        animal,
        now,
        movingAnimal
          ? `Animal movement tracked (ID ${animal.id}).`
          : "Animal class from on-device detector.",
      );
      if (movingAnimal) {
        const last = cues[cues.length - 1];
        if (last?.kind === "animal") {
          last.alert.title = "Animal movement detected";
          last.alert.event_type = "animal_movement";
          last.event.kind = "animal_movement";
          last.event.description = last.alert.description;
        }
      }
    }
    if (groupReady) {
      this.pushCue(
        cues,
        "group-movement",
        persons[0],
        now,
        `${persons.length} people moving together in view.`,
      );
    }
    if (crossingTrack) {
      this.pushCue(
        cues,
        "border-crossing",
        crossingTrack,
        now,
        "Track crossed the monitored fence / restricted boundary.",
      );
    }
    if (loiterTrack && !crossingTrack) {
      this.pushCue(
        cues,
        "loitering",
        loiterTrack,
        now,
        "Low displacement over dwell window.",
      );
    }
    if (night && (persons.length > 0 || animals.length > 0)) {
      const prev = this.lastFire.get("night") ?? 0;
      if (now - prev >= 14000) {
        this.lastFire.set("night", now);
        cues.push(makeNightCue(this.cameraId, (persons[0] ?? animals[0]).id));
      }
    }

    if (night) {
      for (const cue of cues) {
        if (cue.kind === "night") continue;
        cue.alert.night = true;
        cue.alert.reason = `${cue.alert.reason ?? ""}, +10 Night-time / low-light`.replace(/^, /, "");
        cue.alert.risk_score = Math.min(1, (cue.alert.risk_score ?? 0) + 0.1);
        cue.alert.risk_breakdown = [
          ...(cue.alert.risk_breakdown ?? []),
          { signal: "Night-time / low-light", delta: 10 },
        ];
      }
    }

    const threat: DemoScenario | null = crossingTrack
      ? "border-crossing"
      : animalReady
        ? "animal"
        : groupReady
          ? "group-movement"
          : loiterTrack
            ? "loitering"
            : null;

    const tracks: Detection[] = this.tracks.map((t) => ({
      track_id: t.id,
      label: t.label,
      confidence: t.confidence,
      bbox: t.bbox,
    }));

    return { tracks, cues, threat, inZone: anyoneInZone, night };
  }

  private pushCue(cues: BehaviorCue[], kind: DemoScenario, track: Track, now: number, extra: string) {
    const prev = this.lastFire.get(kind) ?? 0;
    if (now - prev < 10000) return;
    this.lastFire.set(kind, now);
    cues.push(makeCue(this.cameraId, kind, track.id, extra));
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
  scene?: { night?: boolean; fence?: FenceLine | null },
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
