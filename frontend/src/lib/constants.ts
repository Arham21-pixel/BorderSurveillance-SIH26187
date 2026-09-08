export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
    : "ws://localhost:8000/ws");

// Synthetic demo coordinates for map defaults (non-operational)
export const DEFAULT_MAP_CENTER: [number, number] = [23.3501, 78.1025];
export const DEFAULT_MAP_ZOOM = 12;

export const SEVERITY_CONFIG = {
  critical: {
    label: "Critical",
    color: "#FF4D67",
    bg: "rgba(255, 77, 103, 0.15)",
    border: "#FF4D67",
  },
  high: {
    label: "High",
    color: "#FF8A2A",
    bg: "rgba(255, 138, 42, 0.15)",
    border: "#FF8A2A",
  },
  suspicious: {
    label: "Suspicious",
    color: "#F2C94C",
    bg: "rgba(242, 201, 76, 0.15)",
    border: "#F2C94C",
  },
  normal: {
    label: "Normal",
    color: "#35D07F",
    bg: "rgba(53, 208, 127, 0.15)",
    border: "#35D07F",
  },
} as const;
