import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
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
import { resetCameraAnalyzer, episodeKey, type BehaviorCue } from "../lib/behaviorEngine";
import { persistEvidenceSnapshot } from "../lib/evidenceStorage";
import { analyzeClipFile, fetchVideoStatus, type SessionStatusResponse } from "../services/api";
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
  activeKeys?: string[];
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
  episode: string,
  openEpisodes: Map<string, { alertId: string; eventId: string }>,
  setEvents: Dispatch<SetStateAction<EventItem[]>>,
  setAlerts: Dispatch<SetStateAction<Alert[]>>,
) {
  if (openEpisodes.has(episode)) return;
  const ts = new Date().toISOString();
  const tag = cue.event.kind || cue.alert.event_type || "event";
  const eventId = `EVT-${cameraId}-${Date.now()}-${tag}`;
  const alertId = `ALT-${cameraId}-${Date.now()}-${tag}`;
  openEpisodes.set(episode, { alertId, eventId });
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

function dropCameraEpisodes(openEpisodes: Map<string, { alertId: string; eventId: string }>, cameraId: string) {
  for (const key of [...openEpisodes.keys()]) {
    if (key.startsWith(`${cameraId}:`)) openEpisodes.delete(key);
  }
}

function asRisk01(score: unknown): number {
  const n = Number(score ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function trajectoryPoints(raw: unknown): { x: number; y: number }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points: { x: number; y: number }[] = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length >= 2) {
      points.push({ x: Number(item[0]), y: Number(item[1]) });
    } else if (item && typeof item === "object" && "x" in item && "y" in item) {
      const row = item as { x: unknown; y: unknown };
      points.push({ x: Number(row.x), y: Number(row.y) });
    }
  }
  return points.length ? points : undefined;
}

function scenarioFromFilename(name: string): DemoScenario {
  const n = name.toLowerCase();
  if (n.includes("border") || n.includes("cross")) return "border-crossing";
  if (n.includes("group")) return "group-movement";
  if (n.includes("animal")) return "animal";
  if (n.includes("night")) return "night";
  return "loitering";
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<Record<string, CameraRuntime>>(defaultRuntime);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [analyzing, setAnalyzing] = useState(true);
  const prevProgress = useRef<Record<string, number>>({});
  const openEpisodes = useRef<Map<string, { alertId: string; eventId: string }>>(new Map());
  const pipelineOwned = useRef<Set<string>>(new Set());
  const clipJobs = useRef<Map<string, string>>(new Map());
  const mergedPipeline = useRef<Set<string>>(new Set());
  const [pipelineTick, setPipelineTick] = useState(0);
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  const cameras = useMemo<Camera[]>(
    () =>
      DEMO_CAMERA_FLEET.map((cam) => ({
        ...cam,
        status: "online",
        videoUrl: runtime[cam.id]?.videoUrl ?? null,
        scenario: runtime[cam.id]?.threat ?? runtime[cam.id]?.scenario ?? cam.scenario,
        source: runtime[cam.id]?.videoUrl ? cam.id : cam.source,
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
        const active = new Set(meta.activeKeys ?? []);
        for (const cue of meta.cues ?? []) {
          if (cue.kind === "night") continue;
          const key =
            cue.key ||
            episodeKey(cameraId, cue.kind, cue.kind === "group-movement" ? null : cue.alert.track_id);
          active.add(key);
          if (!cue.alert.clip_url) {
            cue.alert.clip_url = runtimeRef.current[cameraId]?.videoUrl ?? null;
          }
          if (meta.snapshot && !cue.alert.snapshot_url) {
            cue.alert.snapshot_url = meta.snapshot;
          }
          if (clipName) cue.alert.clip_name = clipName;
          emitCue(cue, cameraId, key, openEpisodes.current, setEvents, setAlerts);
        }
        if (meta.activeKeys) {
          const closeAlertIds: string[] = [];
          for (const [key, rec] of [...openEpisodes.current.entries()]) {
            if (!key.startsWith(`${cameraId}:`)) continue;
            if (key.includes(":script:")) continue;
            if (active.has(key)) continue;
            openEpisodes.current.delete(key);
            closeAlertIds.push(rec.alertId);
          }
          if (closeAlertIds.length) {
            const closed = new Set(closeAlertIds);
            setAlerts((list) =>
              list.map((alert) =>
                closed.has(alert.id) && alert.status === "open" ? { ...alert, status: "closed" } : alert,
              ),
            );
          }
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
        if (cue.alert.event_type === "night_activity" || cue.event.kind === "night_activity") continue;
        const key = `${cameraId}:script:${cue.id}`;
        if (meta?.snapshot) {
          cue.alert.snapshot_url = meta.snapshot;
        }
        cue.alert.trajectory_points = syntheticTrackPath(scenario, progress);
        cue.alert.clip_url = runtimeRef.current[cameraId]?.videoUrl ?? cue.alert.clip_url ?? null;
        emitCue(cue, cameraId, key, openEpisodes.current, setEvents, setAlerts);
      }
    },
    [analyzing],
  );

  const assignUpload = useCallback((cameraId: string, file: File) => {
    const url = URL.createObjectURL(file);
    const inferred = scenarioFromFilename(file.name);
    resetCameraAnalyzer(cameraId);
    dropCameraEpisodes(openEpisodes.current, cameraId);
    setAlerts((list) => list.filter((a) => a.camera_id !== cameraId));
    setEvents((list) => list.filter((e) => e.camera_id !== cameraId));
    setRuntime((prev) => {
      const old = prev[cameraId]?.videoUrl;
      if (old) URL.revokeObjectURL(old);
      return {
        ...prev,
        [cameraId]: {
          videoUrl: url,
          scenario: inferred,
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
    clipJobs.current.delete(cameraId);
    void analyzeClipFile(cameraId, file)
      .then((res) => {
        clipJobs.current.set(cameraId, res.session_id);
        setPipelineTick((n) => n + 1);
      })
      .catch(() => {
        pipelineOwned.current.delete(cameraId);
        clipJobs.current.delete(cameraId);
      });
  }, []);

  const clearUpload = useCallback((cameraId: string) => {
    resetCameraAnalyzer(cameraId);
    dropCameraEpisodes(openEpisodes.current, cameraId);
    pipelineOwned.current.delete(cameraId);
    clipJobs.current.delete(cameraId);
    for (const key of [...mergedPipeline.current]) {
      if (key.startsWith(`${cameraId}:`)) mergedPipeline.current.delete(key);
    }
    setAlerts((list) => list.filter((a) => a.camera_id !== cameraId));
    setEvents((list) => list.filter((e) => e.camera_id !== cameraId));
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

  const applyPipelineResult = useCallback((cameraId: string, status: SessionStatusResponse) => {
    const result = status.result;
    if (!result?.event_id) return;
    const token = `${cameraId}:${result.event_id}`;
    if (mergedPipeline.current.has(token)) return;
    mergedPipeline.current.add(token);

    const ts = new Date().toISOString();
    const kind = String(result.kind ?? result.event_type ?? "event");
    const risk = asRisk01(result.risk_score);
    const description = String(result.description ?? kind);
    const eventId = String(result.event_id);
    setEvents((list) =>
      [
        {
          id: eventId,
          camera_id: cameraId,
          track_id: null,
          kind,
          description,
          risk_score: risk,
          timestamp: ts,
        },
        ...list,
      ].slice(0, 80),
    );

    if (!result.alert_id) return;
    const alertId = String(result.alert_id);
    const snapshot = typeof result.snapshot_url === "string" ? result.snapshot_url : null;
    const clip =
      (typeof result.clip_url === "string" ? result.clip_url : null) ??
      runtimeRef.current[cameraId]?.videoUrl ??
      null;
    setAlerts((list) =>
      [
        {
          id: alertId,
          event_id: eventId,
          camera_id: cameraId,
          severity: String(result.severity ?? "SUSPICIOUS"),
          title: String(result.title ?? kind),
          description,
          status: "open",
          timestamp: ts,
          risk_score: risk,
          snapshot_url: snapshot,
          clip_url: clip,
          clip_name: runtimeRef.current[cameraId]?.clipName ?? undefined,
          event_type: String(result.event_type ?? kind),
          reason: Array.isArray(result.reasons) ? result.reasons.join(", ") : undefined,
          object_class: result.object_class,
          trajectory_points: trajectoryPoints(result.trajectory),
        },
        ...list,
      ].slice(0, 80),
    );
    // #region agent log
    {
      const body = JSON.stringify({
        sessionId: "9f5899",
        runId: "post-fix",
        hypothesisId: "H5",
        location: "DemoSessionContext.tsx:applyPipelineResult",
        message: "Merged pipeline alert media",
        data: {
          cameraId,
          clipKind: clip ? (clip.startsWith("blob:") ? "blob" : clip.startsWith("/") ? "path" : "other") : "none",
          clipSample: clip ? clip.slice(0, 80) : null,
          snapshot: Boolean(snapshot),
          trajCount: Array.isArray(result.trajectory) ? result.trajectory.length : 0,
          firstTraj: Array.isArray(result.trajectory) ? result.trajectory[0] : null,
          eventId: result.event_id ?? null,
          alertId: result.alert_id ?? null,
        },
        timestamp: Date.now(),
      });
      fetch("http://127.0.0.1:7510/ingest/295ef66e-9961-4f13-8dff-1e570b2b49ce", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9f5899" },
        body,
      }).catch(() => {});
      fetch("/__debug_log", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {});
    }
    // #endregion
  }, []);

  useEffect(() => {
    if (clipJobs.current.size === 0) return;
    let cancelled = false;
    const poll = async () => {
      for (const [cameraId, sessionId] of [...clipJobs.current.entries()]) {
        try {
          const st = await fetchVideoStatus(sessionId);
          if (cancelled) return;
          // #region agent log
          {
            const body = JSON.stringify({
              sessionId: "9f5899",
              runId: "post-fix",
              hypothesisId: "H6",
              location: "DemoSessionContext.tsx:poll",
              message: "Clip job status",
              data: {
                cameraId,
                status: st.status,
                error: st.error ?? null,
                eventId: st.result?.event_id ?? null,
                alertId: st.result?.alert_id ?? null,
                clipKind: st.result?.clip_url
                  ? String(st.result.clip_url).startsWith("/")
                    ? "path"
                    : "other"
                  : "none",
                owned: pipelineOwned.current.has(cameraId),
              },
              timestamp: Date.now(),
            });
            fetch("/__debug_log", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {});
          }
          // #endregion
          if (st.status === "complete") {
            clipJobs.current.delete(cameraId);
            applyPipelineResult(cameraId, st);
            if (!st.result?.event_id) pipelineOwned.current.delete(cameraId);
          } else if (st.status === "error" || st.status === "stopped") {
            pipelineOwned.current.delete(cameraId);
            clipJobs.current.delete(cameraId);
          }
        } catch {
          pipelineOwned.current.delete(cameraId);
          clipJobs.current.delete(cameraId);
          // #region agent log
          fetch("/__debug_log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "9f5899",
              runId: "post-fix",
              hypothesisId: "H6",
              location: "DemoSessionContext.tsx:poll-miss",
              message: "Clip job poll failed; overlay unlocked",
              data: { cameraId, sessionId },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        }
      }
    };
    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pipelineTick, applyPipelineResult]);

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
