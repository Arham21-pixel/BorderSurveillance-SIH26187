import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import type { Camera } from "../types/camera";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../lib/constants";

interface CameraMapProps {
  cameras: Camera[];
  activeCameraId?: string;
  onSelectCamera?: (camera: Camera) => void;
  height?: string | number;
}

// Tactical SVG marker icon generator
function createTacticalIcon(status: string, isActive: boolean) {
  const isOnline = status === "online";
  const color = isActive ? "#ff4d4d" : isOnline ? "#20D5C5" : "#64748b";
  const pulseClass = isOnline ? "animate-pulse" : "";

  return L.divIcon({
    className: "tactical-camera-pin",
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${color}20;
          border: 1.5px solid ${color};
        " class="${pulseClass}"></div>
        <div style="
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 10px ${color};
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export default function CameraMap({
  cameras,
  activeCameraId,
  onSelectCamera,
  height = "100%",
}: CameraMapProps) {
  // Determine map center based on first camera or demo default
  const center = useMemo<[number, number]>(() => {
    const camWithCoords = cameras.find((c) => c.latitude && c.longitude);
    if (camWithCoords && camWithCoords.latitude && camWithCoords.longitude) {
      return [camWithCoords.latitude, camWithCoords.longitude];
    }
    return DEFAULT_MAP_CENTER;
  }, [cameras]);

  return (
    <div
      style={{ height, width: "100%", position: "relative" }}
      className="rounded-xl overflow-hidden border border-white/[0.08] leaflet-dark-tiles"
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#080D11" }}
      >
        {/* OpenStreetMap Base Tile Layer with dark theme filter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        {/* Demo Surveillance Coverage Circle */}
        <Circle
          center={DEFAULT_MAP_CENTER}
          radius={2500}
          pathOptions={{
            color: "#20D5C5",
            fillColor: "#20D5C5",
            fillOpacity: 0.05,
            weight: 1.5,
            dashArray: "5, 6",
          }}
        />

        {/* Camera Markers */}
        {cameras.filter((c) => c.latitude != null && c.longitude != null).map((camera) => {
          const lat = camera.latitude as number;
          const lon = camera.longitude as number;
          const isActive = camera.id === activeCameraId;
          const icon = createTacticalIcon(camera.status, isActive);

          return (
            <Marker
              key={camera.id}
              position={[lat, lon]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectCamera?.(camera),
              }}
            >
              <Popup className="tactical-map-popup">
                <div className="p-3 min-w-[170px] bg-[#101820] text-slate-200 rounded-xl text-xs font-sans">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] mb-2">
                    <span className="font-semibold text-white">{camera.name}</span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full font-medium ${
                        camera.status === "online"
                          ? "bg-emerald-500/15 text-[#39D98A]"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-1">
                    <div>Sector: <span className="text-white uppercase font-semibold">{camera.sector}</span></div>
                    <div>Source: <span className="text-slate-300">{camera.source}</span></div>
                    <div>Location: Simulated map position</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Tactical HUD Info Overlay */}
      <div className="absolute top-2.5 right-2.5 z-[400] bg-[#080D11]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] font-mono text-slate-400 shadow-lg">
        SECTOR: <span className="text-[#19D3C5] font-semibold">DEMO SURVEILLANCE</span>
      </div>
    </div>
  );
}
