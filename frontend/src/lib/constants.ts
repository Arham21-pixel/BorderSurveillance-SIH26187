export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
    : "ws://localhost:8000/ws");

// Prototype sector on the India–Pakistan IB belt near Tanot–Kishangarh,
// Jaisalmer district, Rajasthan — not a live BSF post.
export const DEFAULT_MAP_CENTER: [number, number] = [27.8142, 70.1864];
export const DEFAULT_MAP_ZOOM = 14;
export const SECTOR_NAME = "Jaisalmer IB";
export const SECTOR_REGION = "Rajasthan";
export const SECTOR_COORDS_LABEL = "27.81°N 70.19°E";
export const SECTOR_SHORT_LABEL = `${SECTOR_NAME} · ${SECTOR_COORDS_LABEL}`;

export const COLORS = {
  bg: "#070B12",
  card: "#0C141C",
  card2: "#101A24",
  line: "#1A343C",
  text: "#F4F8FA",
  muted: "#8B9AA6",
  muted2: "#64727A",
  accent: "#26E5E5",
  normal: "#35D07F",
  suspicious: "#F2C94C",
  high: "#FF922E",
  critical: "#FF4D67",
} as const;

export const SEVERITY_CONFIG = {
  critical: {
    label: "Critical",
    color: COLORS.critical,
    bg: "rgba(255, 77, 103, 0.15)",
    border: COLORS.critical,
  },
  high: {
    label: "High",
    color: COLORS.high,
    bg: "rgba(255, 146, 46, 0.15)",
    border: COLORS.high,
  },
  suspicious: {
    label: "Suspicious",
    color: COLORS.suspicious,
    bg: "rgba(242, 201, 76, 0.15)",
    border: COLORS.suspicious,
  },
  normal: {
    label: "Normal",
    color: COLORS.normal,
    bg: "rgba(53, 208, 127, 0.15)",
    border: COLORS.normal,
  },
} as const;

export const CHART_TOOLTIP = {
  backgroundColor: "rgba(12, 20, 28, 0.94)",
  borderColor: "rgba(38, 229, 229, 0.22)",
  borderRadius: "12px",
  fontSize: "12px",
  color: COLORS.text,
  boxShadow: "0 8px 30px rgba(0,0,0,0.55), 0 0 18px rgba(38,229,229,0.08)",
};
