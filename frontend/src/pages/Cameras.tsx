import { useState, useMemo } from "react";
import { useCameras } from "../hooks/useCameras";
import { useAlerts } from "../hooks/useAlerts";
import { useVideoSource, DEMO_MP4_OPTIONS } from "../hooks/useVideoSource";
import CameraFeed from "../components/CameraFeed";
import {
  Video,
  Radio,
  Search,
  Activity,
  AlertTriangle,
  Compass,
  Cpu,
  ChevronDown,
  Play,
  Square,
  Wifi,
  Camera,
  FileVideo,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Analysis state helpers
// ---------------------------------------------------------------------------
type StateConfig = {
  dot: string;
  label: string;
  labelColor: string;
  pulse: boolean;
};

const STATE_DISPLAY: Record<string, StateConfig> = {
  IDLE: {
    dot: "bg-slate-500",
    label: "SELECT VIDEO SOURCE",
    labelColor: "text-slate-400",
    pulse: false,
  },
  READY: {
    dot: "bg-[#19D3C5]",
    label: "READY",
    labelColor: "text-[#19D3C5]",
    pulse: false,
  },
  ANALYZING: {
    dot: "bg-[#35D07F]",
    label: "ANALYZING",
    labelColor: "text-[#35D07F]",
    pulse: true,
  },
  STOPPED: {
    dot: "bg-slate-400",
    label: "STOPPED",
    labelColor: "text-slate-400",
    pulse: false,
  },
  ERROR: {
    dot: "bg-[#FF4D67]",
    label: "ERROR",
    labelColor: "text-[#FF4D67]",
    pulse: false,
  },
  OFFLINE: {
    dot: "bg-rose-500",
    label: "FEED OFFLINE",
    labelColor: "text-rose-400",
    pulse: false,
  },
};

export default function Cameras() {
  const cameras = useCameras();
  const alerts = useAlerts();
  const vs = useVideoSource();

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

  // The camera_id sent to backend: prefer real UUID, fall back to "DEMO-01"
  const effectiveCameraId = selectedCamera?.id ?? "DEMO-01";

  const stateConfig = STATE_DISPLAY[vs.analysisState] ?? STATE_DISPLAY["IDLE"];

  // -------------------------------------------------------------------------
  // Handler shortcuts
  // -------------------------------------------------------------------------
  const handleStart = () => vs.startAnalysis(effectiveCameraId);
  const handleStop = () => vs.stopAnalysis();
  const handleConnect = () => vs.connectRtsp(effectiveCameraId);

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ── Header & Fleet Telemetry Bar ── */}
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
            {/* Demo mode badge */}
            {vs.isDemoMode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25">
                <FileVideo className="w-2.5 h-2.5" />
                DEMO MODE
              </span>
            )}
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

      {/* ── Main Command Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Primary Stage: VIDEO SOURCE + Feed (Col 8) ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* ── VIDEO SOURCE PANEL ── */}
          <div className="p-5 rounded-2xl bg-[#101820] border border-white/[0.07] shadow-xl space-y-4">

            {/* Panel header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-[#19D3C5]" />
                VIDEO SOURCE
              </span>
              {/* Inline analysis status badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${stateConfig.dot} ${stateConfig.pulse ? "animate-pulse" : ""}`}
                />
                <span className={`text-[11px] font-mono font-semibold ${stateConfig.labelColor}`}>
                  {stateConfig.label}
                </span>
              </div>
            </div>

            {/* Source type selector + mode-specific controls */}
            <div className="flex flex-wrap items-start gap-4">

              {/* Source type dropdown */}
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Source Type
                </label>
                <div className="relative">
                  <select
                    value={vs.sourceType}
                    onChange={(e) => vs.setSourceType(e.target.value as "mp4" | "rtsp" | "webcam")}
                    className="w-full appearance-none bg-[#0C141C] border border-white/[0.10] text-white text-xs font-medium rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:border-[#19D3C5]/50 transition-colors cursor-pointer"
                  >
                    <option value="mp4">Demo Video / MP4</option>
                    <option value="rtsp">RTSP Camera</option>
                    <option value="webcam">Webcam</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* ── MP4 mode ── */}
              {vs.sourceType === "mp4" && (
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Select Demo Video
                  </label>
                  <div className="relative">
                    <select
                      value={vs.mp4File}
                      onChange={(e) => vs.setMp4File(e.target.value as typeof vs.mp4File)}
                      className="w-full appearance-none bg-[#0C141C] border border-white/[0.10] text-white text-xs font-medium rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:border-[#19D3C5]/50 transition-colors cursor-pointer"
                    >
                      {DEMO_MP4_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {/* Description of selected video */}
                  <p className="text-[10px] text-slate-500 pl-1">
                    {DEMO_MP4_OPTIONS.find((o) => o.value === vs.mp4File)?.description}
                  </p>
                </div>
              )}

              {/* ── RTSP mode ── */}
              {vs.sourceType === "rtsp" && (
                <div className="flex-1 min-w-[280px] space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Camera Name
                    </label>
                    <input
                      type="text"
                      value={vs.rtspCameraName}
                      onChange={(e) => vs.setRtspCameraName(e.target.value)}
                      placeholder="e.g. North Gate Camera"
                      className="w-full bg-[#0C141C] border border-white/[0.10] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#19D3C5]/50 placeholder-slate-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      RTSP URL
                    </label>
                    <input
                      type="text"
                      value={vs.rtspUrl}
                      onChange={(e) => vs.setRtspUrl(e.target.value)}
                      placeholder="rtsp://camera-address/stream"
                      className="w-full bg-[#0C141C] border border-white/[0.10] text-white text-xs font-mono rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#19D3C5]/50 placeholder-slate-600 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* ── Webcam mode ── */}
              {vs.sourceType === "webcam" && (
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Browser Camera
                  </label>
                  {vs.webcamStream ? (
                    <div className="flex items-center gap-2 text-xs text-[#35D07F] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Webcam active — preview below
                    </div>
                  ) : (
                    <button
                      onClick={vs.startWebcam}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#19D3C5]/10 text-[#19D3C5] border border-[#19D3C5]/30 hover:bg-[#19D3C5]/20 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      START WEBCAM
                    </button>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Browser requests camera permission. Frames can be forwarded to the backend pipeline.
                  </p>
                </div>
              )}
            </div>

            {/* ── Action row: START / STOP / CONNECT ── */}
            <div className="flex flex-wrap items-center gap-3 pt-1">

              {/* MP4 / RTSP: Start + Stop */}
              {vs.sourceType !== "webcam" && (
                <>
                  {vs.analysisState !== "ANALYZING" ? (
                    <button
                      onClick={vs.sourceType === "rtsp" ? handleConnect : handleStart}
                      disabled={vs.sourceType === "rtsp" && !vs.rtspUrl.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#19D3C5] text-[#071011] hover:bg-[#35D07F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#19D3C5]/20"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {vs.sourceType === "rtsp" ? "CONNECT" : "START ANALYSIS"}
                    </button>
                  ) : (
                    <button
                      onClick={handleStop}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#FF4D67]/10 text-[#FF4D67] border border-[#FF4D67]/30 hover:bg-[#FF4D67]/20 transition-colors shadow-sm"
                    >
                      <Square className="w-3.5 h-3.5" />
                      STOP ANALYSIS
                    </button>
                  )}
                </>
              )}

              {/* Webcam: STOP WEBCAM / START ANALYSIS */}
              {vs.sourceType === "webcam" && vs.webcamStream && (
                <>
                  {vs.analysisState !== "ANALYZING" ? (
                    <button
                      onClick={handleStart}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#19D3C5] text-[#071011] hover:bg-[#35D07F] transition-colors shadow-md shadow-[#19D3C5]/20"
                    >
                      <Play className="w-3.5 h-3.5" />
                      START ANALYSIS
                    </button>
                  ) : (
                    <button
                      onClick={handleStop}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#FF4D67]/10 text-[#FF4D67] border border-[#FF4D67]/30 hover:bg-[#FF4D67]/20 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      STOP ANALYSIS
                    </button>
                  )}
                  <button
                    onClick={vs.stopWebcam}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Stop Webcam
                  </button>
                </>
              )}

              {/* Analysing: spinner label */}
              {vs.analysisState === "ANALYZING" && (
                <span className="flex items-center gap-2 text-xs text-[#35D07F] font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pipeline running — check Dashboard for results
                </span>
              )}

              {/* Error message */}
              {vs.errorMessage && (
                <div className="flex items-center gap-2 text-xs text-[#FF4D67] font-mono bg-[#FF4D67]/10 border border-[#FF4D67]/20 rounded-xl px-3.5 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-sm" title={vs.errorMessage}>
                    {vs.errorMessage}
                  </span>
                  <button
                    onClick={vs.clearError}
                    className="ml-auto text-slate-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* ── Source summary strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.06] text-[10px] font-mono">
              <div>
                <div className="text-slate-500 mb-0.5">SOURCE TYPE</div>
                <div className="text-slate-200 uppercase font-semibold">
                  {vs.sourceType === "mp4" ? "Demo MP4" : vs.sourceType === "rtsp" ? "RTSP Camera" : "Webcam"}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">SOURCE REF</div>
                <div className="text-slate-200 truncate" title={vs.sourceType === "mp4" ? vs.mp4File : vs.sourceType === "rtsp" ? vs.rtspUrl : "browser:webcam"}>
                  {vs.sourceType === "mp4"
                    ? vs.mp4File
                    : vs.sourceType === "rtsp"
                    ? vs.rtspUrl || "—"
                    : "browser:webcam"}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">CAMERA ID</div>
                <div className="text-slate-200">{effectiveCameraId.substring(0, 16)}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">SESSION</div>
                <div className="text-slate-200">
                  {vs.sessionId ? vs.sessionId.substring(0, 8) + "…" : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* ── Camera Feed ── */}
          <CameraFeed
            camera={selectedCamera ?? undefined}
            cameras={cameras}
            onSelectCamera={(c) => setSelectedCameraId(c.id)}
            showControls={true}
            analysisState={vs.analysisState}
            sourceType={vs.sourceType}
            mp4File={vs.sourceType === "mp4" ? vs.mp4File : undefined}
            webcamStream={vs.webcamStream}
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

              {/* Analysis state inline */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">ANALYSIS</div>
                  <div className={`font-semibold font-mono ${stateConfig.labelColor}`}>
                    {vs.analysisState}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Camera List & Filter Sidebar (Col 4) ── */}
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

      {/* ── Multi-Camera Mosaic Overview Grid ── */}
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
                    <span className="font-mono text-[10px]">
                      {(() => {
                        const state: string = vs.analysisState;
                        if (isSelected && state === "ANALYZING") return "ANALYZING";
                        if (isOnline) return "DEMO VIDEO ACTIVE";
                        return "SIGNAL OFFLINE";
                      })()}
                    </span>
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
