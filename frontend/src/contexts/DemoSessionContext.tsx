import { createContext, useCallback, useContext, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Alert } from "../types/alert";
import type { EventItem } from "../types/event";
import type { Camera } from "../types/camera";
import type { Detection } from "../types/detection";
import {
  DEMO_CAMERA_FLEET,
  cuesTriggered,
  syntheticTrackPath,
  type DemoScenario,
} from "../lib/demoScenarios";
import { resetCameraAnalyzer, type BehaviorCue } from "../lib/behaviorEngine";
import { persistEvidenceSnapshot } from "../lib/evidenceStorage";
import type { FenceLine } from "../lib/fence";

interface CameraRuntime {
  videoUrl: string | null;
  scenario: DemoScenario;
  threat: DemoScenario | null;
  analyzing: boolean;
  detections: Detection[];
  night: boolean;
  clipName: string | null;
  fence: FenceLine | null;
}

export type ReportTickMeta = {
  vision?: boolean;
  threat?: DemoScenario | null;
  cues?: BehaviorCue[];
  night?: boolean;
  luminance?: number;
  snapshot?: string | null;
};

interface DemoSessionValue {
  cameras: Camera[];
  alerts: Alert[];
  events: EventItem[];
  analyzing: boolean;
  runtime: Record<string, CameraRuntime>;
  setAnalyzing: (value: boolean) => void;
  assignUpload: (cameraId: string, file: File) => void;
  clearUpload: (cameraId: string) => void;
  setFenceLine: (cameraId: string, fence: FenceLine) => void;
  reportTick: (
    cameraId: string,
    scenario: DemoScenario,
    progress: number,
    detections: Detection[],
    meta?: ReportTickMeta,
  ) => void;
}

const DemoSessionContext = createContext<DemoSessionValue | null>(null);

function defaultRuntime(): Record<string, CameraRuntime> {
  const map: Record<string, CameraRuntime> = {};
  for (const cam of DEMO_CAMERA_FLEET) {
    map[cam.id] = {
      videoUrl: null,
      scenario: (cam.scenario as DemoScenario) ?? "loitering",
      threat: null,
      analyzing: true,
      detections: [],
      night: false,
      clipName: null,
      fence: null,
    };
  }
  return map;
}

function emitCue(
  cue: { alert: BehaviorCue["alert"]; event: BehaviorCue["event"] },
  cameraId: string,
  setEvents: Dispatch<SetStateAction<EventItem[]>>,
  setAlerts: Dispatch<SetStateAction<Alert[]>>,
) {
  const ts = new Date().toISOString();
  const tag = cue.event.kind || cue.alert.event_type || "event";
  const eventId = `EVT-${cameraId}-${Date.now()}-${tag}`;
  const alertId = `ALT-${cameraId}-${Date.now()}-${tag}`;
  setEvents((list) =>
    [
      { id: eventId, timestamp: ts, ...cue.event, camera_id: cameraId },
      ...list,
    ].slice(0, 80),
  );
  setAlerts((list) =>
    [
      {
        id: alertId,
        event_id: eventId,
        timestamp: ts,
        status: "open",
        ...cue.alert,
        camera_id: cameraId,
      },
      ...list,
    ].slice(0, 80),
  );
  void persistEvidenceSnapshot(cameraId, alertId, cue.alert.snapshot_url);
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<Record<string, CameraRuntime>>(defaultRuntime);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [analyzing, setAnalyzing] = useState(true);
  const prevProgress = useRef<Record<string, number>>({});
  const fired = useRef<Set<string>>(new Set());
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  const cameras = useMemo<Camera[]>(
    () =>
      DEMO_CAMERA_FLEET.map((cam) => ({
        ...cam,
        status: "online",
        videoUrl: runtime[cam.id]?.videoUrl ?? null,
        scenario: runtime[cam.id]?.threat ?? runtime[cam.id]?.scenario ?? cam.scenario,
        source: runtime[cam.id]?.videoUrl ? "uploaded-mp4" : cam.source,
      })),
    [runtime],
  );

  const reportTick = useCallback(
    (
      cameraId: string,
      scenario: DemoScenario,
      progress: number,
      _detections: Detection[],
      meta?: ReportTickMeta,
    ) => {
      void _detections;
      if (!analyzing) {
        prevProgress.current[cameraId] = progress;
        return;
      }

      const hasUpload = Boolean(runtimeRef.current[cameraId]?.videoUrl);

      if (meta?.vision) {
        const cur = runtimeRef.current[cameraId];
        const nextThreat = meta.threat ?? cur?.threat ?? null;
        const shouldWriteRuntime =
          !cur ||
          cur.threat !== nextThreat ||
          cur.night !== Boolean(meta.night) ||
          (meta.cues?.length ?? 0) > 0;
        if (shouldWriteRuntime) {
          setRuntime((prev) => {
            const existing = prev[cameraId];
            if (!existing) return prev;
            return {
              ...prev,
              [cameraId]: {
                ...existing,
                threat: nextThreat,
                scenario: nextThreat ?? existing.scenario,
                night: Boolean(meta.night),
              },
            };
          });
        }
        const clipName = runtimeRef.current[cameraId]?.clipName;
        for (const cue of meta.cues ?? []) {
          const key = `${cameraId}:vision:${cue.kind}`;
          const lastKey = `${key}:${Math.floor(Date.now() / 14000)}`;
          if (fired.current.has(lastKey)) continue;
          fired.current.add(lastKey);
          if (!cue.alert.clip_url) {
            cue.alert.clip_url = runtimeRef.current[cameraId]?.videoUrl ?? null;
          }
          if (meta.snapshot && !cue.alert.snapshot_url) {
            cue.alert.snapshot_url = meta.snapshot;
          }
          if (clipName) cue.alert.clip_name = clipName;
          emitCue(cue, cameraId, setEvents, setAlerts);
        }
        prevProgress.current[cameraId] = progress;
        return;
      }

      if (hasUpload) {
        prevProgress.current[cameraId] = progress;
        return;
      }

      const prevU = prevProgress.current[cameraId] ?? 0;
      const windowStart = progress + 0.02 < prevU ? 0 : prevU;
      const cues = cuesTriggered(scenario, windowStart, progress, cameraId);
      prevProgress.current[cameraId] = progress;

      for (const cue of cues) {
        const key = `${cameraId}:${cue.id}:${Math.floor(Date.now() / 20000)}`;
        if (fired.current.has(key)) continue;
        fired.current.add(key);
        if (meta?.snapshot) {
          cue.alert.snapshot_url = meta.snapshot;
        }
        cue.alert.trajectory_points = syntheticTrackPath(scenario, progress);
        cue.alert.clip_url = runtimeRef.current[cameraId]?.videoUrl ?? cue.alert.clip_url ?? null;
        emitCue(cue, cameraId, setEvents, setAlerts);
      }
    },
    [analyzing],
  );

  const assignUpload = useCallback((cameraId: string, file: File) => {
    const url = URL.createObjectURL(file);
    resetCameraAnalyzer(cameraId);
    fired.current = new Set([...fired.current].filter((k) => !k.startsWith(`${cameraId}:`)));
    setAlerts((list) => list.filter((a) => a.camera_id !== cameraId));
    setEvents((list) => list.filter((e) => e.camera_id !== cameraId));
    setRuntime((prev) => {
      const old = prev[cameraId]?.videoUrl;
      if (old) URL.revokeObjectURL(old);
      return {
        ...prev,
        [cameraId]: {
          videoUrl: url,
          scenario: (prev[cameraId]?.scenario as DemoScenario) ?? "loitering",
          threat: null,
          analyzing: true,
          detections: [],
          night: false,
          clipName: file.name,
          fence: prev[cameraId]?.fence ?? null,
        },
      };
    });
    prevProgress.current[cameraId] = 0;
    setAnalyzing(true);
  }, []);

  const clearUpload = useCallback((cameraId: string) => {
    resetCameraAnalyzer(cameraId);
    setRuntime((prev) => {
      const base = DEMO_CAMERA_FLEET.find((c) => c.id === cameraId);
      return {
        ...prev,
        [cameraId]: {
          videoUrl: null,
          scenario: (base?.scenario as DemoScenario) ?? "loitering",
          threat: null,
          analyzing: true,
          detections: [],
          night: false,
          clipName: null,
          fence: null,
        },
      };
    });
  }, []);

  const setFenceLine = useCallback((cameraId: string, fence: FenceLine) => {
    setRuntime((prev) => {
      const existing = prev[cameraId];
      if (!existing) return prev;
      return {
        ...prev,
        [cameraId]: { ...existing, fence },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      cameras,
      alerts,
      events,
      analyzing,
      runtime,
      setAnalyzing,
      assignUpload,
      clearUpload,
      setFenceLine,
      reportTick,
    }),
    [cameras, alerts, events, analyzing, runtime, assignUpload, clearUpload, setFenceLine, reportTick],
  );

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
}

export function useDemoSession() {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) {
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  }
  return ctx;
}

export function useDemoSessionOptional() {
  return useContext(DemoSessionContext);
}
