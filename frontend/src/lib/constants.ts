export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
    : "ws://localhost:8000/ws");

export const DEFAULT_MAP_CENTER: [number, number] = [34.1526, 77.5771];
export const DEFAULT_MAP_ZOOM = 12;

export const SEVERITY_CONFIG = {
  high: {
    label: "High",
    color: "#ff5a5a",
    bg: "rgba(255, 90, 90, 0.15)",
    border: "#ff5a5a",
  },
  medium: {
    label: "Medium",
    color: "#f5b942",
    bg: "rgba(245, 185, 66, 0.15)",
    border: "#f5b942",
  },
  low: {
    label: "Low",
    color: "#5ad67a",
    bg: "rgba(90, 214, 122, 0.15)",
    border: "#5ad67a",
  },
} as const;
