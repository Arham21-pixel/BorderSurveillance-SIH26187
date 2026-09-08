import { useState, useMemo } from "react";
import { useCameras } from "../hooks/useCameras";
import { useAlerts } from "../hooks/useAlerts";
import CameraFeed from "../components/CameraFeed";
import {
  Video,
  Radio,
  Search,
  Activity,
  AlertTriangle,
  Compass,
  Cpu
} from "lucide-react";

export default function Cameras() {
  const cameras = useCameras();
  const alerts = useAlerts();

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Determine active camera
  const selectedCamera = useMemo(() => {
    if (selectedCameraId) {
      const found = cameras.find((c) => c.id === selectedCameraId);
      if (found) return found;
    }
    return cameras[0] ?? null;
  }, [cameras, selectedCameraId]);

  // Unique sectors
  const sectors = useMemo(() => {
    const set = new Set<string>();
    cameras.forEach((c) => {
      if (c.sector) set.add(c.sector);
    });
    return Array.from(set);
  }, [cameras]);

  // Filtered cameras list
  const filteredCameras = useMemo(() => {
    return cameras.filter((c) => {
      const matchesSector = sectorFilter === "all" || c.sector === sectorFilter;
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sector.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSector && matchesSearch;
    });
  }, [cameras, sectorFilter, searchQuery]);

  const onlineCount = cameras.filter((c) => c.status === "online").length;
  const offlineCount = cameras.length - onlineCount;

  // Check if selected camera has active alerts
  const activeAlertsForCamera = alerts.filter(
    (a) => a.camera_id === selectedCamera?.id && a.status === "open"
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Header & Fleet Telemetry Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-500/15 text-[#39D98A] border border-emerald-500/25">
              <Radio className="w-3 h-3 animate-pulse" />
              Live Surveillance Fleet
            </span>
            <span className="text-xs font-mono text-slate-400">
              Ladakh Sector 4 · Line of Actual Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Live CCTV Feeds & Camera Fleet
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-camera border streams, spatial perimeter overlays, and AI track telemetry.
          </p>
        </div>

        {/* Fleet KPI Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#39D98A] animate-ping" />
            <span className="text-[#39D98A] font-bold font-mono">{onlineCount}</span>
            <span className="text-slate-400">Online</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-rose-400 font-bold font-mono">{offlineCount}</span>
            <span className="text-slate-400">Offline</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <Video className="w-4 h-4 text-[#20D5C5]" />
            <span className="text-white font-bold font-mono">{cameras.length}</span>
            <span className="text-slate-400">Total</span>
          </div>
        </div>
      </div>

      {/* Main Command Workspace: Primary Live Feed + Camera Selector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Stage Feed (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <CameraFeed
            camera={selectedCamera ?? undefined}
            cameras={cameras}
            onSelectCamera={(c) => setSelectedCameraId(c.id)}
            showControls={true}
          />

          {/* Selected Camera Detailed Telemetry Strip */}
          {selectedCamera && (
            <div className="p-4 rounded-2xl bg-[#101820] border border-white/[0.07] flex flex-wrap items-center justify-between gap-4 text-xs shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">AI PIPELINE</div>
                  <div className="text-slate-200 font-semibold font-mono">YOLOv8n + SimpleTracker</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">GEOSPATIAL COORDS</div>
                  <div className="text-slate-200 font-semibold font-mono">
                    {selectedCamera.latitude ? `${selectedCamera.latitude.toFixed(4)}°N, ${selectedCamera.longitude?.toFixed(4)}°E` : "34.1526°N, 77.5771°E"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">THREAT STATUS</div>
                  <div className={activeAlertsForCamera.length > 0 ? "text-rose-400 font-semibold font-mono" : "text-[#39D98A] font-semibold font-mono"}>
                    {activeAlertsForCamera.length > 0 ? `${activeAlertsForCamera.length} Active Alerts` : "Clear"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Camera List & Filter Sidebar (Col 4) */}
        <div className="lg:col-span-4 bg-[#101820] border border-white/[0.07] rounded-2xl p-5 flex flex-col h-[580px] shadow-xl">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-[#20D5C5]" />
              Camera Stations ({filteredCameras.length})
            </span>
            <span className="text-[11px] font-mono text-[#20D5C5]">
              {selectedCamera?.name}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative mb-3.5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station or sector..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#20D5C5]/50 transition-colors"
            />
          </div>

          {/* Sector Filter Chips */}
          <div className="flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setSectorFilter("all")}
              className={`px-3 py-1 rounded-lg transition-colors capitalize text-xs ${
                sectorFilter === "all"
                  ? "bg-[#20D5C5]/15 text-[#20D5C5] border border-[#20D5C5]/30 font-semibold"
                  : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]"
              }`}
            >
              All
            </button>
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                className={`px-3 py-1 rounded-lg transition-colors capitalize whitespace-nowrap text-xs ${
                  sectorFilter === s
                    ? "bg-[#20D5C5]/15 text-[#20D5C5] border border-[#20D5C5]/30 font-semibold"
                    : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Camera Stations List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredCameras.map((camera) => {
              const isSelected = selectedCamera?.id === camera.id;
              const isOnline = camera.status === "online";
              const camAlerts = alerts.filter(
                (a) => a.camera_id === camera.id && a.status === "open"
              );

              return (
                <div
                  key={camera.id}
                  onClick={() => setSelectedCameraId(camera.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#141E28] border-[#20D5C5]/40 shadow-lg shadow-black/30"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? "bg-[#39D98A] animate-pulse" : "bg-rose-500"
                        }`}
                      />
                      <span className="text-xs font-semibold text-white">
                        {camera.name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
                        isOnline
                          ? "bg-emerald-500/10 text-[#39D98A] border-emerald-500/25"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                    <span className="flex items-center gap-1 capitalize">
                      <Compass className="w-3 h-3 text-[#20D5C5]" />
                      Sector: {camera.sector}
                    </span>
                    <span>Src: {camera.source}</span>
                  </div>

                  {camAlerts.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-rose-400">
                      <span className="flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {camAlerts.length} Unacknowledged Alert
                      </span>
                      <span className="font-semibold underline">Focus Feed →</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Camera Mosaic Overview Grid */}
      <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
          <span className="text-xs font-semibold text-white flex items-center gap-2">
            <Video className="w-4 h-4 text-[#20D5C5]" />
            Multi-Camera Mosaic Grid (Click to focus primary stage)
          </span>
          <span className="text-xs font-mono text-slate-400">
            3 STATIONS ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((c) => {
            const isSelected = selectedCamera?.id === c.id;
            const isOnline = c.status === "online";
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCameraId(c.id)}
                className={`group rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#080D11] ${
                  isSelected
                    ? "border-[#20D5C5] ring-1 ring-[#20D5C5] shadow-lg shadow-[#20D5C5]/10"
                    : "border-white/[0.07] hover:border-white/[0.18]"
                }`}
              >
                {/* Mini Preview Header */}
                <div className="p-3 bg-[#101820] border-b border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? "bg-[#39D98A]" : "bg-rose-500"
                      }`}
                    />
                    <span>{c.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {c.sector}
                  </span>
                </div>

                {/* Simulated Mini Viewport */}
                <div className="aspect-video relative bg-[#080D11] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#20D5C5_1px,transparent_1px)] [background-size:12px_12px]" />
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-[#20D5C5] bg-[#080D11]/90 px-2 py-0.5 rounded-md border border-white/[0.06]">
                    {c.id}
                  </div>
                  <div className="text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                    <Video className="w-5 h-5 group-hover:text-[#20D5C5] transition-colors" />
                    <span className="font-mono text-[10px]">{isOnline ? "30 FPS LIVE STREAM" : "SIGNAL OFFLINE"}</span>
                  </div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500 bg-[#080D11]/90 px-2 py-0.5 rounded-md border border-white/[0.06]">
                    SRC: {c.source}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
