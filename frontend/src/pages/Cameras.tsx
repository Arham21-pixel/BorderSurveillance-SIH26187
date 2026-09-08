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
  const displayOnline = cameras.length > 0 ? onlineCount : 1;
  const displayTotal = cameras.length > 0 ? cameras.length : 3;

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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-[#35D07F]/15 text-[#35D07F] border border-[#35D07F]/25">
              <Radio className="w-3 h-3 animate-pulse" />
              Video Monitoring
            </span>
            <span className="text-xs font-mono text-slate-400">
              Simulated Monitoring Zone
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Live CCTV Feeds & Camera Fleet
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Video feeds and camera monitoring.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Live or recorded video with AI detection, tracking and zone overlays.
          </p>
        </div>

        {/* Fleet KPI Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#35D07F] animate-ping" />
            <span className="text-[#35D07F] font-bold font-mono">{displayOnline}</span>
            <span className="text-slate-400">Online</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-rose-400 font-bold font-mono">{offlineCount}</span>
            <span className="text-slate-400">Offline</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#101820] border border-white/[0.07] flex items-center gap-2 shadow-sm">
            <Video className="w-4 h-4 text-[#19D3C5]" />
            <span className="text-white font-bold font-mono">{displayTotal}</span>
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
                  <div className="text-slate-200 font-semibold font-mono">YOLO + ByteTrack · CPU-FIRST</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">MAP LABEL</div>
                  <div className="text-slate-200 font-semibold font-mono">
                    {selectedCamera.sector ? `SIMULATED LOCATION · ${selectedCamera.sector.toUpperCase()}` : "SIMULATED LOCATION"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">RISK STATUS</div>
                  <div className={activeAlertsForCamera.length > 0 ? "text-[#FF8A2A] font-semibold font-mono" : "text-[#35D07F] font-semibold font-mono"}>
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
              <Video className="w-4 h-4 text-[#19D3C5]" />
              Camera Monitoring ({filteredCameras.length})
            </span>
            <span className="text-[11px] font-mono text-[#19D3C5]">
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
              placeholder="Search camera or sector..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#19D3C5]/50 transition-colors"
            />
          </div>

          {/* Sector Filter Chips */}
          <div className="flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setSectorFilter("all")}
              className={`px-3 py-1 rounded-lg transition-colors capitalize text-xs ${
                sectorFilter === "all"
                  ? "bg-[#19D3C5]/15 text-[#19D3C5] border border-[#19D3C5]/30 font-semibold"
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
                    ? "bg-[#19D3C5]/15 text-[#19D3C5] border border-[#19D3C5]/30 font-semibold"
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
                      ? "bg-[#111E23] border-[#19D3C5]/40 shadow-lg shadow-black/30"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? "bg-[#35D07F] animate-pulse" : "bg-[#FF4D67]"
                        }`}
                      />
                      <span className="text-xs font-semibold text-white">
                        {camera.name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
                        isOnline
                          ? "bg-[#35D07F]/10 text-[#35D07F] border-[#35D07F]/25"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                    <span className="flex items-center gap-1 capitalize">
                      <Compass className="w-3 h-3 text-[#19D3C5]" />
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
            <Video className="w-4 h-4 text-[#19D3C5]" />
            Demo Camera Mosaic (Click to focus primary stage)
          </span>
          <span className="text-xs font-mono text-slate-400">
            {displayOnline} / {displayTotal} ACTIVE
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
                className={`group rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#071011] ${
                  isSelected
                    ? "border-[#19D3C5] ring-1 ring-[#19D3C5] shadow-lg shadow-[#19D3C5]/10"
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
                <div className="aspect-video relative bg-[#071011] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#19D3C5_1px,transparent_1px)] [background-size:12px_12px]" />
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-[#19D3C5] bg-[#071011]/90 px-2 py-0.5 rounded-md border border-white/[0.06]">
                    {c.id}
                  </div>
                  <div className="text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                    <Video className="w-5 h-5 group-hover:text-[#19D3C5] transition-colors" />
                    <span className="font-mono text-[10px]">{isOnline ? "DEMO VIDEO ACTIVE" : "SIGNAL OFFLINE"}</span>
                  </div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500 bg-[#071011]/90 px-2 py-0.5 rounded-md border border-white/[0.06]">
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
