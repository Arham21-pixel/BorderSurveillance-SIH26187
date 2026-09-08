import { useCameras } from "../hooks/useCameras";
import { useAlerts } from "../hooks/useAlerts";
import CameraMap from "../components/CameraMap";
import { MapPin, Radio } from "lucide-react";

export default function MapPage() {
  const cameras = useCameras();
  const alerts = useAlerts();

  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Tactical Sector Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Geospatial surveillance grid for Northern Command (Ladakh Sector) with real-time camera tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#39D98A]" />
            <span className="text-slate-200 font-semibold font-mono">{cameras.filter((c) => c.status === "online").length}</span>
            <span className="text-slate-400">Online</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-rose-400 font-semibold font-mono">{openAlerts.length}</span>
            <span className="text-slate-400">Threats</span>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
          <span className="text-xs font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#20D5C5]" />
            GIS Perimeter Overview (Ladakh Line of Actual Control)
          </span>
          <span className="text-xs font-mono text-[#20D5C5]">
            34.1526° N, 77.5771° E
          </span>
        </div>

        <div className="h-[520px] rounded-xl overflow-hidden border border-white/[0.08]">
          <CameraMap cameras={cameras} />
        </div>

        {/* Camera List Footer Grid */}
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          {cameras.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-slate-500">
              No surveillance cameras registered on the GIS grid. Cameras will appear here once connected.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Radio className={`w-4 h-4 ${cam.status === "online" ? "text-[#39D98A]" : "text-slate-500"}`} />
                    <div>
                      <div className="text-xs font-semibold text-white">{cam.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 capitalize">
                        Sector: {cam.sector}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
                      cam.status === "online"
                        ? "bg-emerald-500/10 text-[#39D98A] border-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {cam.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
