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
    <div className="space-y-6">
      {/* Header & Fleet Telemetry Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#243140]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#14321c] text-[#5ad67a] border border-[#5ad67a]/40">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE SURVEILLANCE FLEET
            </span>
            <span className="text-[11px] font-mono text-[#8fa3b8]">
              LADAKH SECTOR 4 · LINE OF ACTUAL CONTROL
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
            Live CCTV Feeds & Camera Fleet
          </h1>
          <p className="text-xs text-[#8fa3b8] mt-1">
            Real-time multi-camera border streams, spatial perimeter overlays, and AI track telemetry.
          </p>
        </div>

        {/* Fleet KPI Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-2 rounded-lg bg-[#101820] border border-[#243140] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5ad67a] animate-ping" />
            <span className="text-[#5ad67a] font-bold">{onlineCount}</span>
            <span className="text-[#8fa3b8]">ONLINE</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#101820] border border-[#243140] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5a5a]" />
            <span className="text-[#ff5a5a] font-bold">{offlineCount}</span>
            <span className="text-[#8fa3b8]">OFFLINE</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#101820] border border-[#243140] flex items-center gap-2">
            <Video className="w-4 h-4 text-[#3dd6c6]" />
            <span className="text-[#e8eef5] font-bold">{cameras.length}</span>
            <span className="text-[#8fa3b8]">TOTAL</span>
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
            <div className="p-4 rounded-xl bg-[#101820] border border-[#243140] flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0c141c] border border-[#243140] text-[#3dd6c6]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[#8fa3b8] text-[10px]">AI PIPELINE</div>
                  <div className="text-[#e8eef5] font-bold">YOLOv8n + SimpleTracker</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0c141c] border border-[#243140] text-[#3dd6c6]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[#8fa3b8] text-[10px]">GEOSPATIAL COORDS</div>
                  <div className="text-[#e8eef5] font-bold">
                    {selectedCamera.latitude ? `${selectedCamera.latitude.toFixed(4)}°N, ${selectedCamera.longitude?.toFixed(4)}°E` : "34.1526°N, 77.5771°E"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0c141c] border border-[#243140] text-[#3dd6c6]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[#8fa3b8] text-[10px]">THREAT STATUS</div>
                  <div className={activeAlertsForCamera.length > 0 ? "text-[#ff5a5a] font-bold" : "text-[#5ad67a] font-bold"}>
                    {activeAlertsForCamera.length > 0 ? `${activeAlertsForCamera.length} ACTIVE ALERTS` : "CLEAR"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Camera List & Filter Sidebar (Col 4) */}
        <div className="lg:col-span-4 bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-3">
            <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
              <Video className="w-4 h-4 text-[#3dd6c6]" />
              Camera Stations ({filteredCameras.length})
            </span>
            <span className="text-[10px] font-mono text-[#3dd6c6]">
              {selectedCamera?.name}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-[#8fa3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station or sector..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] placeholder-[#8fa3b8]/50 focus:outline-none focus:border-[#3dd6c6] font-mono"
            />
          </div>

          {/* Sector Filter Chips */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
            <button
              onClick={() => setSectorFilter("all")}
              className={`px-2.5 py-1 rounded transition-colors uppercase ${
                sectorFilter === "all"
                  ? "bg-[#16202b] text-[#3dd6c6] border border-[#3dd6c6]/40 font-bold"
                  : "bg-[#0c141c] text-[#8fa3b8] hover:text-[#e8eef5] border border-[#243140]"
              }`}
            >
              All
            </button>
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                className={`px-2.5 py-1 rounded transition-colors uppercase whitespace-nowrap ${
                  sectorFilter === s
                    ? "bg-[#16202b] text-[#3dd6c6] border border-[#3dd6c6]/40 font-bold"
                    : "bg-[#0c141c] text-[#8fa3b8] hover:text-[#e8eef5] border border-[#243140]"
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
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#16202b] border-[#3dd6c6]/60 shadow-md shadow-[#3dd6c6]/10"
                      : "bg-[#0c141c] border-[#243140] hover:border-[#3dd6c6]/30 hover:bg-[#101820]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? "bg-[#5ad67a] animate-pulse" : "bg-[#ff5a5a]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#e8eef5]">
                        {camera.name}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        isOnline
                          ? "bg-[#14321c] text-[#5ad67a]"
                          : "bg-[#2a2a2a] text-[#8fa3b8]"
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8fa3b8] mt-2">
                    <span className="flex items-center gap-1 uppercase">
                      <Compass className="w-3 h-3 text-[#3dd6c6]" />
                      Sector: {camera.sector}
                    </span>
                    <span>Src: {camera.source}</span>
                  </div>

                  {camAlerts.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-[#243140]/60 flex items-center justify-between text-[10px] font-mono text-[#ff5a5a]">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {camAlerts.length} Unacknowledged Alert
                      </span>
                      <span className="underline">Focus Feed →</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Camera Mosaic Overview Grid */}
      <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-4">
          <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
            <Video className="w-4 h-4 text-[#3dd6c6]" />
            Multi-Camera Mosaic Grid (Click to focus primary stage)
          </span>
          <span className="text-xs font-mono text-[#8fa3b8]">
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
                className={`group rounded-lg overflow-hidden border transition-all cursor-pointer bg-[#0c141c] ${
                  isSelected
                    ? "border-[#3dd6c6] ring-1 ring-[#3dd6c6]"
                    : "border-[#243140] hover:border-[#3dd6c6]/50"
                }`}
              >
                {/* Mini Preview Header */}
                <div className="p-2.5 bg-[#101820] border-b border-[#243140] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 font-bold text-[#e8eef5]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? "bg-[#5ad67a]" : "bg-[#ff5a5a]"
                      }`}
                    />
                    <span>{c.name}</span>
                  </div>
                  <span className="text-[10px] text-[#8fa3b8] uppercase">
                    {c.sector}
                  </span>
                </div>

                {/* Simulated Mini Viewport */}
                <div className="aspect-video relative bg-[#070b10] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3dd6c6_1px,transparent_1px)] [background-size:12px_12px]" />
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-[#3dd6c6] bg-[#0c141c]/80 px-1.5 py-0.5 rounded">
                    {c.id}
                  </div>
                  <div className="text-center font-mono text-[11px] text-[#8fa3b8] flex flex-col items-center gap-1">
                    <Video className="w-5 h-5 group-hover:text-[#3dd6c6] transition-colors" />
                    <span>{isOnline ? "30 FPS LIVE STREAM" : "SIGNAL OFFLINE"}</span>
                  </div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-[#8fa3b8] bg-[#0c141c]/80 px-1.5 py-0.5 rounded">
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
