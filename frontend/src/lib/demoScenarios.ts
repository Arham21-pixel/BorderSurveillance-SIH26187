import type { Detection } from "../types/detection";
import type { Alert } from "../types/alert";
import type { EventItem } from "../types/event";
import type { Camera } from "../types/camera";

export type DemoScenario = "loitering" | "border-crossing" | "group-movement" | "animal" | "night";

export const DEMO_CAMERA_FLEET: Camera[] = [
  {
    id: "CAM-01",
    name: "Gate Cam 01",
    source: "loitering.mp4",
    sector: "Entry Gate",
    status: "online",
    latitude: 27.8142,
    longitude: 70.1864,
    scenario: "loitering",
    videoUrl: null,
  },
  {
    id: "CAM-02",
    name: "Fence Cam 02",
    source: "border-crossing.mp4",
    sector: "Restricted Fence",
    status: "online",
    latitude: 27.8246,
    longitude: 70.1728,
    scenario: "border-crossing",
    videoUrl: null,
  },
  {
    id: "CAM-03",
    name: "Approach Cam 03",
    source: "group-movement.mp4",
    sector: "Approach Path",
    status: "online",
    latitude: 27.8058,
    longitude: 70.1794,
    scenario: "group-movement",
    videoUrl: null,
  },
  {
    id: "CAM-04",
    name: "Wildlife Cam 04",
    source: "animal.mp4",
    sector: "Perimeter scrub",
    status: "online",
    latitude: 27.8094,
    longitude: 70.1716,
    scenario: "animal",
    videoUrl: null,
  },
  {
    id: "CAM-05",
    name: "Night Cam 05",
    source: "night.mp4",
    sector: "Low-light post",
    status: "online",
    latitude: 27.8212,
    longitude: 70.1822,
    scenario: "night",
    videoUrl: null,
  },
];

export const SCENARIO_META: Record<
  DemoScenario,
  { label: string; file: string; description: string; zone?: string }
> = {
  loitering: {
    label: "Loitering",
    file: "loitering.mp4",
    description: "Dwell-time / standing near the gate",
    zone: "Entry Gate",
  },
  "border-crossing": {
    label: "Boundary crossing",
    file: "border-crossing.mp4",
    description: "Person entering the restricted zone",
    zone: "Restricted Zone A",
  },
  "group-movement": {
    label: "Group walking",
    file: "group-movement.mp4",
    description: "Multiple people moving together",
    zone: "Approach Path",
  },
  animal: {
    label: "Animal",
    file: "animal.mp4",
    description: "Non-human object in the monitored area",
    zone: "Perimeter scrub",
  },
  night: {
    label: "Night / low-light",
    file: "night.mp4",
    description: "Low-light activity with false-color assist",
    zone: "Low-light post",
  },
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function box(x: number, y: number, w: number, h: number, label: string, track: number, conf: number): Detection {
  return {
    track_id: track,
    label,
    confidence: conf,
    bbox: {
      x1: clamp01(x),
      y1: clamp01(y),
      x2: clamp01(x + w),
      y2: clamp01(y + h),
    },
  };
}

/** u is loop progress 0..1 */
export function detectionsAt(scenario: DemoScenario, u: number): Detection[] {
  const t = ((u % 1) + 1) % 1;

  if (scenario === "loitering") {
    const walkIn = Math.min(1, t / 0.18);
    const walkOut = t > 0.82 ? (t - 0.82) / 0.18 : 0;
    const x = 0.08 + walkIn * 0.34 - walkOut * 0.4;
    const idle = t > 0.18 && t < 0.82 ? Math.sin(t * 40) * 0.004 : 0;
    return [box(x + idle, 0.38, 0.09, 0.38, "person", 11, 0.91)];
  }

  if (scenario === "border-crossing") {
    const x = 0.04 + t * 0.78;
    return [box(x, 0.36, 0.1, 0.42, "person", 17, 0.93)];
  }

  if (scenario === "group-movement") {
    const x = 0.02 + t * 0.7;
    return [
      box(x, 0.4, 0.08, 0.36, "person", 21, 0.9),
      box(x + 0.09, 0.42, 0.075, 0.34, "person", 22, 0.88),
      box(x + 0.17, 0.39, 0.08, 0.37, "person", 23, 0.86),
    ];
  }

  if (scenario === "night") {
    const walkIn = Math.min(1, t / 0.2);
    const x = 0.12 + walkIn * 0.42;
    return [box(x, 0.4, 0.1, 0.36, "person", 41, 0.88)];
  }

  const x = 0.7 - t * 0.55;
  return [box(x, 0.58, 0.16, 0.12, "animal", 31, 0.84)];
}

export function syntheticTrackPath(scenario: DemoScenario, progress: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const start = Math.max(0, progress - 0.24);
  for (let i = 0; i <= 16; i++) {
    const u = start + ((progress - start) * i) / 16;
    const det = detectionsAt(scenario, u)[0];
    if (!det) continue;
    points.push({
      x: (det.bbox.x1 + det.bbox.x2) / 2,
      y: (det.bbox.y1 + det.bbox.y2) / 2,
    });
  }
  return points;
}

export function zoneVisible(scenario: DemoScenario): boolean {
  return scenario === "border-crossing";
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  loitering: "Loitering",
  restricted_zone_entry: "Boundary crossing",
  group_movement: "Group walking",
  animal_detected: "Animal",
  animal_movement: "Animal movement",
  night_activity: "Night / low-light",
};

type Cue = {
  id: string;
  at: number;
  alert: Omit<Alert, "id" | "event_id" | "timestamp" | "status">;
  event: Omit<EventItem, "id" | "timestamp">;
};

const CUES: Record<DemoScenario, Cue[]> = {
  loitering: [
    {
      id: "loiter-1",
      at: 0.42,
      alert: {
        camera_id: "CAM-01",
        severity: "SUSPICIOUS",
        title: "Loitering near gate",
        description: "Track 11 remained in the same location beyond the dwell threshold.",
        risk_score: 0.46,
        reason: "+20 Loitering / dwell time, +10 Night-time context",
        event_type: "loitering",
        track_id: 11,
        zone: "Entry Gate",
        trajectory: "Stationary cluster near gate line.",
        evidence_path: "demo://loitering/snapshot",
        object_class: "person",
        night: true,
        risk_breakdown: [
          { signal: "Loitering", delta: 20 },
          { signal: "Night-time context", delta: 10 },
        ],
      },
      event: {
        camera_id: "CAM-01",
        track_id: 11,
        kind: "loitering",
        description: "Dwell time exceeded near Entry Gate (Track 11).",
        risk_score: 0.46,
        zone: "Entry Gate",
        evidence_path: "demo://loitering/snapshot",
      },
    },
  ],
  "border-crossing": [
    {
      id: "cross-1",
      at: 0.48,
      alert: {
        camera_id: "CAM-02",
        severity: "HIGH",
        title: "Restricted zone entry",
        description: "Track 17 crossed the restricted boundary line.",
        risk_score: 0.72,
        reason: "+40 Restricted-zone entry, +10 Night-time context",
        event_type: "restricted_zone_entry",
        track_id: 17,
        zone: "Restricted Zone A",
        trajectory: "Left approach into Restricted Zone A.",
        evidence_path: "demo://border-crossing/snapshot",
        object_class: "person",
        risk_breakdown: [
          { signal: "Restricted-zone entry", delta: 40 },
          { signal: "Night-time context", delta: 10 },
        ],
      },
      event: {
        camera_id: "CAM-02",
        track_id: 17,
        kind: "restricted_zone_entry",
        description: "Restricted Zone A entry detected for Track 17.",
        risk_score: 0.72,
        zone: "Restricted Zone A",
        evidence_path: "demo://border-crossing/snapshot",
      },
    },
  ],
  "group-movement": [
    {
      id: "group-1",
      at: 0.36,
      alert: {
        camera_id: "CAM-03",
        severity: "SUSPICIOUS",
        title: "Group movement",
        description: "Three people moving together along the approach path.",
        risk_score: 0.38,
        reason: "+15 Group movement, +10 Night-time context",
        event_type: "group_movement",
        track_id: 21,
        zone: "Approach Path",
        trajectory: "Three tracks moving in formation.",
        evidence_path: "demo://group-movement/snapshot",
        object_class: "person",
        risk_breakdown: [
          { signal: "Group movement", delta: 15 },
          { signal: "Night-time context", delta: 10 },
        ],
      },
      event: {
        camera_id: "CAM-03",
        track_id: 21,
        kind: "group_movement",
        description: "Group of 3 detected on Approach Path.",
        risk_score: 0.38,
        zone: "Approach Path",
        evidence_path: "demo://group-movement/snapshot",
      },
    },
  ],
  animal: [
    {
      id: "animal-1",
      at: 0.4,
      alert: {
        camera_id: "CAM-03",
        severity: "NORMAL",
        title: "Animal movement detected",
        description: "Non-human object classified as animal and tracked across the frame.",
        risk_score: 0.18,
        reason: "Animal class — no restricted-zone human entry",
        event_type: "animal_movement",
        track_id: 31,
        zone: "Perimeter scrub",
        trajectory: "Lateral movement along scrub line.",
        evidence_path: "demo://animal/snapshot",
        object_class: "animal",
        risk_breakdown: [{ signal: "Non-human class", delta: -10 }],
      },
      event: {
        camera_id: "CAM-03",
        track_id: 31,
        kind: "animal_movement",
        description: "Animal track 31 observed on perimeter.",
        risk_score: 0.18,
        zone: "Perimeter scrub",
        evidence_path: "demo://animal/snapshot",
      },
    },
  ],
  night: [
    {
      id: "night-1",
      at: 0.38,
      alert: {
        camera_id: "CAM-05",
        severity: "SUSPICIOUS",
        title: "Night / low-light activity",
        description: "Motion under low illumination. False-color assist applied.",
        risk_score: 0.34,
        reason: "+10 Night-time / low-light context",
        event_type: "night_activity",
        track_id: 41,
        zone: "Low-light post",
        trajectory: "Activity under low illumination.",
        evidence_path: "demo://night/snapshot",
        object_class: "person",
        night: true,
        risk_breakdown: [{ signal: "Night-time / low-light", delta: 10 }],
      },
      event: {
        camera_id: "CAM-05",
        track_id: 41,
        kind: "night_activity",
        description: "Low-light activity on Night Cam 05.",
        risk_score: 0.34,
        zone: "Low-light post",
        evidence_path: "demo://night/snapshot",
      },
    },
  ],
};

export function cuesTriggered(scenario: DemoScenario, prevU: number, nextU: number, cameraId: string): Cue[] {
  return (CUES[scenario] ?? []).map((cue) => ({
    ...cue,
    alert: { ...cue.alert, camera_id: cameraId },
    event: { ...cue.event, camera_id: cameraId },
  })).filter((cue) => prevU < cue.at && nextU >= cue.at);
}
