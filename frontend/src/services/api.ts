import type { Alert, Camera, DetectionResult, EventItem, AnalyticsSummary } from "../types";

const API = import.meta.env.VITE_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

export const fetchCameras = () => get<Camera[]>("/api/cameras");

export const fetchCamera = (id: string) => get<Camera>(`/api/cameras/${id}`);

export const fetchAlerts = (filters?: { severity?: string; status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.severity) params.append("severity", filters.severity);
  if (filters?.status) params.append("status", filters.status);
  const query = params.toString() ? `?${params.toString()}` : "";
  return get<Alert[]>(`/api/alerts${query}`);
};

export const fetchAlert = (id: string) => get<Alert>(`/api/alerts/${id}`);

export const ackAlert = async (id: string): Promise<Alert> => {
  const response = await fetch(`${API}/api/alerts/${id}/ack`, { method: "POST" });
  if (!response.ok) throw new Error(`ack failed: ${response.status}`);
  return response.json();
};

export const fetchEvents = (limit: number = 50) => get<EventItem[]>(`/api/events?limit=${limit}`);

export const fetchDetections = (cameraId?: string) => {
  if (cameraId) return get<DetectionResult[]>(`/api/detections/${cameraId}`);
  return get<DetectionResult[]>("/api/detections");
};

export const fetchSummary = () => get<AnalyticsSummary>("/api/analytics/summary");
