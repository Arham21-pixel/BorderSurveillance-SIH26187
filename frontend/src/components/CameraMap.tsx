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
  const color = isActive ? "#ff5a5a" : isOnline ? "#3dd6c6" : "#8fa3b8";
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
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color}22;
          border: 1.5px solid ${color};
        " class="${pulseClass}"></div>
        <div style="
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color};
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
  // Determine map center based on first camera or Ladakh default
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
      className="rounded-lg overflow-hidden border border-[#243140] leaflet-dark-tiles"
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#0c141c" }}
      >
        {/* OpenStreetMap Base Tile Layer with dark theme filter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        {/* Sector Defense Coverage Circles */}
        <Circle
          center={DEFAULT_MAP_CENTER}
          radius={2500}
          pathOptions={{
            color: "#3dd6c6",
            fillColor: "#3dd6c6",
            fillOpacity: 0.04,
            weight: 1,
            dashArray: "4, 6",
          }}
        />

        {/* Camera Markers */}
        {cameras.map((camera, index) => {
          // Fallback coordinates around center if lat/lon is null
          const lat = camera.latitude ?? DEFAULT_MAP_CENTER[0] + (index * 0.012 - 0.01);
          const lon = camera.longitude ?? DEFAULT_MAP_CENTER[1] + ((index % 2) * 0.02 - 0.01);
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
                <div className="p-2 min-w-[160px] bg-[#101820] text-[#e8eef5] rounded text-xs font-mono">
                  <div className="flex items-center justify-between pb-1 border-b border-[#243140] mb-1.5">
                    <span className="font-bold text-[#3dd6c6]">{camera.name}</span>
                    <span
                      className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                        camera.status === "online"
                          ? "bg-[#14321c] text-[#5ad67a]"
                          : "bg-[#2a2a2a] text-[#8fa3b8]"
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8fa3b8] space-y-0.5">
                    <div>Sector: <span className="text-[#e8eef5] uppercase">{camera.sector}</span></div>
                    <div>Source: <span className="text-[#e8eef5]">{camera.source}</span></div>
                    <div>Coords: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Tactical HUD Info Overlay */}
      <div className="absolute top-2 right-2 z-[400] bg-[#0c141c]/90 backdrop-blur px-2.5 py-1 rounded border border-[#243140] text-[10px] font-mono text-[#8fa3b8]">
        SECTOR: <span className="text-[#3dd6c6] font-bold">LADAKH SECTOR 4</span>
      </div>
    </div>
  );
}
