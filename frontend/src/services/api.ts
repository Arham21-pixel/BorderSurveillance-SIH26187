import type { Alert } from "../types/alert";
import type { Camera } from "../types/camera";
import type { EventItem } from "../types/event";

const API = import.meta.env.VITE_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(path);
  return response.json();
}

export const fetchCameras = () => get<Camera[]>("/api/cameras");
export const fetchAlerts = () => get<Alert[]>("/api/alerts");
export const fetchEvents = () => get<EventItem[]>("/api/events");
export const fetchSummary = () => get<{
  cameras_online: number;
  cameras_total: number;
  alerts_open: number;
  alerts_by_severity: { high: number; medium: number; low: number };
}>("/api/analytics/summary");

export async function ackAlert(id: string): Promise<Alert> {
  const response = await fetch(`${API}/api/alerts/${id}/ack`, { method: "POST" });
  if (!response.ok) throw new Error("ack failed");
  return response.json();
}
