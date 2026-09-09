import type { Alert, Camera, DetectionResult, EventItem, AnalyticsSummary } from "../types";

const API = import.meta.env.VITE_API_URL ?? "";

type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

function unwrapList<T>(value: T[] | Paginated<T>): T[] {
  return Array.isArray(value) ? value : value.items ?? [];
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

export async function fetchCameras(): Promise<Camera[]> {
  const rows = await get<Array<Record<string, unknown>>>("/api/cameras");
  return rows.map((row) => {
    const status = String(row.status ?? "unknown");
    return {
      id: String(row.id),
      name: String(row.name ?? "Unnamed camera"),
      source: String(row.source ?? row.stream_ref ?? ""),
      sector: String(row.sector ?? row.location ?? "unassigned"),
      status: status.toUpperCase() === "ACTIVE" ? "online" : status.toLowerCase(),
      latitude: typeof row.latitude === "number" ? row.latitude : null,
      longitude: typeof row.longitude === "number" ? row.longitude : null,
      last_seen: typeof row.last_seen === "string" ? row.last_seen : (row.updated_at as string | null) ?? null,
    };
  });
}

export const fetchCamera = (id: string) => get<Camera>(`/api/cameras/${id}`);

export async function fetchAlerts(filters?: { severity?: string; status?: string }): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.append("severity", filters.severity);
  if (filters?.status) params.append("status", filters.status);
  params.append("limit", "50");
  params.append("offset", "0");
  const query = params.toString() ? `?${params.toString()}` : "";
  const raw = await get<Alert[] | Paginated<Record<string, unknown>>>(`/api/alerts${query}`);
  const rows = unwrapList(raw as Alert[] | Paginated<Record<string, unknown>>);
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const reasons: string[] = Array.isArray(r.reasons) ? (r.reasons as string[]) : [];
    // Backend returns NORMAL/SUSPICIOUS/HIGH/CRITICAL — normalise to lowercase
    const severity = String(r.severity ?? "normal").toLowerCase();
    const status = String(r.status ?? "OPEN").toLowerCase();
    const createdAt = String(r.created_at ?? r.timestamp ?? new Date().toISOString());
    const extra = (r.extra ?? {}) as Record<string, unknown>;
    const score = typeof r.risk_score === "number" ? r.risk_score : 0;
    return {
      id: String(r.id ?? ""),
      camera_id: String(extra.camera_code ?? r.camera_id ?? ""),
      event_id: String(r.event_id ?? ""),
      severity,
      title: String(extra.title ?? r.title ?? extra.event_type ?? "Alert"),
      description: String(extra.description ?? r.description ?? (reasons.length ? reasons.join(", ") : "Review required")),
      status,
      evidence_path: (r.evidence_path as string | null | undefined) ?? null,
      timestamp: createdAt,
      created_at: createdAt,
      risk_score: score > 1 ? score / 100 : score,
      reasons,
      extra,
      snapshot_url: typeof extra.snapshot_url === "string" ? extra.snapshot_url : undefined,
      clip_url: typeof extra.clip_url === "string" ? extra.clip_url : undefined,
    };
  });
}

export const fetchAlert = (id: string) => get<Alert>(`/api/alerts/${id}`);

export const ackAlert = async (id: string): Promise<Alert> => {
  const response = await fetch(`${API}/api/alerts/${id}/acknowledge`, { method: "PATCH" });
  if (!response.ok) throw new Error(`ack failed: ${response.status}`);
  return response.json();
};

export async function fetchEvents(limit: number = 50): Promise<EventItem[]> {
  const raw = await get<EventItem[] | Paginated<Record<string, unknown>>>(`/api/events?limit=${limit}&offset=0`);
  const rows = unwrapList(raw as EventItem[] | Paginated<Record<string, unknown>>);
  return rows.map((row) => {
    const rawScore = Number(
      (row as { risk_score?: unknown; event_data?: { risk_score?: unknown } }).risk_score
        ?? (row as { event_data?: { risk_score?: unknown } }).event_data?.risk_score
        ?? 0,
    );
    const data = ((row as { event_data?: Record<string, unknown> }).event_data ?? {}) as Record<string, unknown>;
    return {
      id: String((row as { id?: unknown }).id ?? ""),
      camera_id: String(data.camera_code ?? (row as { camera_id?: unknown }).camera_id ?? ""),
      track_id: ((row as { track_id?: unknown }).track_id as number | string | null | undefined) ?? null,
      kind: String((row as { kind?: unknown; event_type?: unknown }).kind ?? (row as { event_type?: unknown }).event_type ?? "event"),
      description: String(data.description ?? (row as { description?: unknown }).description ?? ""),
      risk_score: rawScore > 1 ? rawScore / 100 : rawScore,
      timestamp: String((row as { timestamp?: unknown }).timestamp ?? new Date().toISOString()),
    };
  });
}

export const fetchDetections = (cameraId?: string) => {
  if (cameraId) return get<DetectionResult[]>(`/api/detections/${cameraId}`);
  return get<DetectionResult[]>("/api/detections");
};

// ---------------------------------------------------------------------------
// Video analysis session API
// ---------------------------------------------------------------------------

export type VideoSourceType = "mp4" | "rtsp" | "webcam";

export interface StartAnalysisRequest {
  source_type: VideoSourceType;
  source_reference: string; // mp4 filename | rtsp:// URL | "webcam"
  camera_id: string;
}

export interface StartAnalysisResponse {
  session_id: string;
  status: string;
  camera_id: string;
  source_type: string;
  source_reference: string;
  started_at: string;
}

export interface SessionStatusResponse {
  session_id: string;
  status: string; // "analyzing" | "stopped" | "error" | "complete"
  source_type: string;
  source_reference: string;
  camera_id: string;
  started_at: string;
  stopped_at: string | null;
  frames_processed: number;
  error?: string | null;
  result?: {
    kind?: string;
    expected?: string;
    alert_created?: boolean;
    event_id?: string | null;
    alert_id?: string | null;
    event_type?: string;
    title?: string;
    description?: string;
    object_class?: string;
    severity?: string;
    risk_score?: number;
    reasons?: string[];
    snapshot_url?: string | null;
    clip_url?: string | null;
    camera_code?: string;
    duration_s?: number;
    trajectory?: Array<[number, number] | { x: number; y: number }>;
  } | null;
}

export async function analyzeClipFile(
  cameraId: string,
  file: File,
): Promise<StartAnalysisResponse> {
  const body = new FormData();
  body.append("camera_id", cameraId);
  body.append("file", file);
  const res = await fetch(`${API}/api/video/analyze-file`, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `analyzeClipFile failed: ${res.status}`);
  }
  return res.json();
}

export async function startVideoAnalysis(
  req: StartAnalysisRequest,
): Promise<StartAnalysisResponse> {
  const res = await fetch(`${API}/api/video/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `startVideoAnalysis failed: ${res.status}`);
  }
  return res.json();
}

export async function stopVideoAnalysis(sessionId: string): Promise<void> {
  const res = await fetch(`${API}/api/video/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`stopVideoAnalysis failed: ${res.status}`);
}

export async function fetchVideoStatus(sessionId: string): Promise<SessionStatusResponse> {
  return get<SessionStatusResponse>(`/api/video/status/${sessionId}`);
}

export async function fetchSummary(): Promise<AnalyticsSummary> {
  const raw = await get<Record<string, unknown>>("/api/analytics/summary");
  const by = (raw.alerts_by_severity as Record<string, number> | undefined) ?? {};
  return {
    cameras_online: Number(raw.cameras_online ?? 0),
    cameras_total: Number(raw.cameras_total ?? 0),
    alerts_open: Number(raw.alerts_open ?? raw.total_alerts ?? 0),
    alerts_by_severity: {
      high: Number(by.high ?? by.HIGH ?? 0),
      medium: Number(by.medium ?? by.MEDIUM ?? by.SUSPICIOUS ?? 0),
      low: Number(by.low ?? by.LOW ?? by.NORMAL ?? 0),
    },
  };
}
