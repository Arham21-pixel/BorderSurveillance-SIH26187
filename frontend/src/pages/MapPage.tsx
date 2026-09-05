import { useCameras } from "../hooks/useCameras";
import { useAlerts } from "../hooks/useAlerts";
import CameraMap from "../components/CameraMap";
import { MapPin, Radio } from "lucide-react";

export default function MapPage() {
  const cameras = useCameras();
  const alerts = useAlerts();

  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
            Tactical Sector Map
          </h1>
          <p className="text-xs sm:text-sm text-[#8fa3b8] mt-1">
            Geospatial surveillance grid for Northern Command (Ladakh Sector) with real-time camera tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#101820] border border-[#243140] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5ad67a]" />
            <span>{cameras.filter((c) => c.status === "online").length} ONLINE</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#101820] border border-[#243140] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff5a5a] animate-pulse" />
            <span>{openAlerts.length} THREATS</span>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-4">
          <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#3dd6c6]" />
            GIS Perimeter Overview (Ladakh Line of Actual Control)
          </span>
          <span className="text-[11px] font-mono text-[#3dd6c6]">
            34.1526° N, 77.5771° E
          </span>
        </div>

        <div className="h-[520px] rounded-lg overflow-hidden border border-[#243140]">
          <CameraMap cameras={cameras} />
        </div>

        {/* Camera List Footer Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#243140]">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="p-3 rounded-lg bg-[#0c141c] border border-[#243140] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`w-4 h-4 ${cam.status === "online" ? "text-[#5ad67a]" : "text-[#8fa3b8]"}`} />
                <div>
                  <div className="text-xs font-semibold text-[#e8eef5]">{cam.name}</div>
                  <div className="text-[10px] font-mono text-[#8fa3b8] uppercase">
                    Sector: {cam.sector}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                  cam.status === "online"
                    ? "bg-[#14321c] text-[#5ad67a]"
                    : "bg-[#2a2a2a] text-[#8fa3b8]"
                }`}
              >
                {cam.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
