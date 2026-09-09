import { useMemo, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  Tooltip,
  ScaleControl,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import type { Camera } from "../types/camera";
import type { Alert } from "../types/alert";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, SECTOR_NAME, SECTOR_REGION } from "../lib/constants";
import { normalizeSeverity } from "./RiskBadge";

interface CameraMapProps {
  cameras: Camera[];
  alerts?: Alert[];
  activeCameraId?: string;
  onSelectCamera?: (camera: Camera) => void;
  height?: string | number;
}

const FENCE: [number, number][] = [
  [27.8325, 70.1658],
  [27.8331, 70.1764],
  [27.7984, 70.1772],
  [27.7978, 70.1664],
];

const RESTRICTED: [number, number][] = [
  [27.8268, 70.1672],
  [27.8274, 70.1748],
  [27.8146, 70.1754],
  [27.8140, 70.1678],
];

const PATROL: [number, number][] = [
  [27.8142, 70.1864],
  [27.8188, 70.1802],
  [27.8246, 70.1728],
  [27.8194, 70.1816],
  [27.8058, 70.1794],
];

const POSTS: { name: string; pos: [number, number] }[] = [
  { name: "Watch post Alpha", pos: [27.8156, 70.1840] },
  { name: "Fence post B-4", pos: [27.8258, 70.1712] },
  { name: "Approach marker", pos: [27.8064, 70.1806] },
];

const CAMERA_FOV: Record<string, { heading: number; range: number; spread: number }> = {
  "CAM-01": { heading: 280, range: 920, spread: 44 },
  "CAM-02": { heading: 268, range: 1100, spread: 50 },
  "CAM-03": { heading: 18, range: 860, spread: 40 },
  "CAM-04": { heading: 330, range: 780, spread: 46 },
  "CAM-05": { heading: 155, range: 900, spread: 42 },
};

function dest(lat: number, lon: number, meters: number, bearingDeg: number): [number, number] {
  const R = 6371000;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const ang = meters / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br));
  const lon2 =
    lon1 +
    Math.atan2(Math.sin(br) * Math.sin(ang) * Math.cos(lat1), Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2));
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function fovWedge(lat: number, lon: number, heading: number, range: number, spread: number): [number, number][] {
  const pts: [number, number][] = [[lat, lon]];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const b = heading - spread / 2 + (spread * i) / steps;
    pts.push(dest(lat, lon, range, b));
  }
  return pts;
}

function createCameraIcon(status: string, isActive: boolean, alertLevel?: string) {
  const isOnline = status === "online";
  const color =
    alertLevel === "CRITICAL" || alertLevel === "HIGH"
      ? "#FF4D67"
      : isActive
        ? "#26E5E5"
        : isOnline
          ? "#35D07F"
          : "#64727A";

  return L.divIcon({
    className: "tactical-camera-pin",
    html: `
      <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:${color}22;border:1.5px solid ${color};box-shadow:0 0 16px ${color}55;"></div>
        <div style="width:11px;height:11px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color}"></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

export default function CameraMap({
  cameras,
  alerts = [],
  activeCameraId,
  onSelectCamera,
  height = "100%",
}: CameraMapProps) {
  const center = useMemo<[number, number]>(() => {
    const camWithCoords = cameras.find((c) => c.latitude && c.longitude);
    if (camWithCoords?.latitude && camWithCoords.longitude) {
      return [camWithCoords.latitude, camWithCoords.longitude];
    }
    return DEFAULT_MAP_CENTER;
  }, [cameras]);

  const alertsByCam = useMemo(() => {
    const map: Record<string, Alert[]> = {};
    for (const alert of alerts) {
      (map[alert.camera_id] ??= []).push(alert);
    }
    return map;
  }, [alerts]);

  return (
    <div
      style={{ height, width: "100%", position: "relative" }}
      className="rounded-xl overflow-hidden border border-white/[0.08] leaflet-sat-tiles"
    >
      <MapContainer
        key={`${center[0].toFixed(4)}-${center[1].toFixed(4)}`}
        center={center}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", background: "#070B12" }}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          attribution="&copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <Polygon
          positions={FENCE}
          pathOptions={{ color: "#26E5E5", weight: 2.2, dashArray: "10 7", fillColor: "#26E5E5", fillOpacity: 0.06 }}
        >
          <Tooltip sticky>IB fence corridor</Tooltip>
        </Polygon>

        <Polygon
          positions={RESTRICTED}
          pathOptions={{ color: "#FF4D67", weight: 2.4, fillColor: "#FF4D67", fillOpacity: 0.22 }}
        >
          <Tooltip sticky>Restricted Zone A</Tooltip>
        </Polygon>

        <Polyline positions={PATROL} pathOptions={{ color: "#F2C94C", weight: 2, dashArray: "5 8", opacity: 0.9 }} />

        <Circle
          center={DEFAULT_MAP_CENTER}
          radius={420}
          pathOptions={{ color: "#26E5E5", fillColor: "#26E5E5", fillOpacity: 0.03, weight: 1 }}
        />

        {POSTS.map((post) => (
          <CircleMarker
            key={post.name}
            center={post.pos}
            radius={5}
            pathOptions={{ color: "#F4F8FA", fillColor: "#101A24", fillOpacity: 0.9, weight: 1.5 }}
          >
            <Tooltip permanent direction="right" offset={[8, 0]} className="cam-map-label">
              {post.name}
            </Tooltip>
          </CircleMarker>
        ))}

        {cameras
          .filter((c) => c.latitude != null && c.longitude != null)
          .map((camera) => {
            const lat = camera.latitude as number;
            const lon = camera.longitude as number;
            const fov = CAMERA_FOV[camera.id];
            const isActive = camera.id === activeCameraId;
            const camAlerts = alertsByCam[camera.id] ?? [];
            const top = camAlerts[0];
            const icon = createCameraIcon(
              camera.status,
              isActive,
              top ? normalizeSeverity(top.severity) : undefined,
            );
            const wedge = fov ? fovWedge(lat, lon, fov.heading, fov.range, fov.spread) : null;

            return (
              <Fragment key={camera.id}>
                {wedge && (
                  <Polygon
                    positions={wedge}
                    pathOptions={{
                      color: isActive ? "#26E5E5" : "#8B9AA6",
                      weight: 1,
                      fillColor: isActive ? "#26E5E5" : "#8B9AA6",
                      fillOpacity: isActive ? 0.16 : 0.08,
                    }}
                  />
                )}
                <Marker
                  position={[lat, lon]}
                  icon={icon}
                  eventHandlers={{ click: () => onSelectCamera?.(camera) }}
                >
                  <Tooltip permanent direction="top" offset={[0, -16]} className="cam-map-label">
                    {camera.id}
                  </Tooltip>
                  <Popup className="tactical-map-popup">
                    <div className="p-3 min-w-[200px] bg-[#0C141C] text-slate-200 rounded-xl text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] mb-2">
                        <span className="font-semibold text-white">{camera.name}</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full ${
                            camera.status === "online"
                              ? "bg-emerald-500/15 text-[#35D07F]"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {camera.status}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 space-y-1">
                        <div>
                          Sector: <span className="text-white">{camera.sector}</span>
                        </div>
                        <div>
                          ID: <span className="text-[#26E5E5]">{camera.id}</span>
                        </div>
                        <div>
                          {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
                        </div>
                        {fov && <div>Coverage ~{Math.round(fov.range / 10) * 10} m cone</div>}
                        {camAlerts.length > 0 && (
                          <div className="text-[#FF922E] pt-1">
                            {camAlerts.length} open alert · {top?.title}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            );
          })}

        <ScaleControl imperial={false} position="bottomright" />
      </MapContainer>

      <div className="absolute top-2.5 left-2.5 z-[400] pointer-events-none">
        <div className="w-12 h-12 rounded-full border border-white/30 bg-[#070B12]/70 backdrop-blur-md flex items-center justify-center text-[10px] font-mono text-white relative">
          <span className="absolute top-1 text-[#FF4D67]">N</span>
          <span className="absolute bottom-1 text-white/50">S</span>
          <span className="w-px h-7 bg-white/70" />
        </div>
      </div>
      <div className="absolute top-2.5 right-2.5 z-[400] bg-[#070B12]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] font-mono text-slate-400 shadow-lg">
        {SECTOR_NAME} <span className="text-[#26E5E5] font-semibold">{SECTOR_REGION}</span>
      </div>
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-[#070B12]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] font-mono text-slate-400 flex gap-3">
        <span className="text-[#26E5E5]">Fence</span>
        <span className="text-[#FF4D67]">Restricted</span>
        <span className="text-[#F2C94C]">Patrol</span>
        <span className="text-white/70">FOV</span>
      </div>
    </div>
  );
}
