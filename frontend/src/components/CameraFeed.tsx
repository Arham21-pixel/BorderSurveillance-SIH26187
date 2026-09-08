import { useState, useEffect, useRef } from "react";
import DetectionOverlay from "./DetectionOverlay";
import { useLiveStream, StreamMode } from "../hooks/useLiveStream";
import type { Camera } from "../types/camera";
import type { AnalysisState, VideoSourceType } from "../hooks/useVideoSource";
import {
  Video,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Layers,
  Crosshair,
  MapPin,
  Clock,
  Compass,
  RefreshCw,
  Sliders,
  AlertCircle,
  FileVideo,
  Wifi,
} from "lucide-react";

interface CameraFeedProps {
  title?: string;
  camera?: Camera;
  cameras?: Camera[];
  onSelectCamera?: (camera: Camera) => void;
  showControls?: boolean;
  // Video source integration
  analysisState?: AnalysisState;
  sourceType?: VideoSourceType;
  mp4File?: string;
  webcamStream?: MediaStream | null;
}

// ---------------------------------------------------------------------------
// Analysis state → HUD display mapping
// ---------------------------------------------------------------------------
const ANALYSIS_HUD: Record<
  string,
  { label: string; dot: string; pulse: boolean; textColor: string }
> = {
  IDLE: {
    label: "SELECT VIDEO SOURCE",
    dot: "bg-slate-500",
    pulse: false,
    textColor: "text-slate-400",
  },
  READY: {
    label: "READY",
    dot: "bg-[#19D3C5]",
    pulse: false,
    textColor: "text-[#19D3C5]",
  },
  ANALYZING: {
    label: "ANALYZING",
    dot: "bg-[#35D07F]",
    pulse: true,
    textColor: "text-[#35D07F]",
  },
  STOPPED: {
    label: "STOPPED",
    dot: "bg-slate-400",
    pulse: false,
    textColor: "text-slate-400",
  },
  ERROR: {
    label: "ERROR",
    dot: "bg-[#FF4D67]",
    pulse: false,
    textColor: "text-[#FF4D67]",
  },
  OFFLINE: {
    label: "FEED OFFLINE",
    dot: "bg-rose-500",
    pulse: false,
    textColor: "text-rose-400",
  },
};

export default function CameraFeed({
  title,
  camera,
  cameras = [],
  onSelectCamera,
  showControls = true,
  analysisState = "IDLE",
  sourceType = "mp4",
  mp4File,
  webcamStream,
}: CameraFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  const [currentTime, setCurrentTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetections, setShowDetections] = useState(true);
  const [showZone, setShowZone] = useState(true);
  const [showStreamSettings, setShowStreamSettings] = useState(false);

  const activeCamera = camera ?? cameras[0] ?? {
    id: "demo-01",
    name: title || "Demo Camera 01",
    sector: "demo-a",
    status: "online",
    source: "0",
    latitude: 23.3501,
    longitude: 78.1025,
    webrtc_url: "/api/cameras/demo-01/webrtc",
    hls_url: "/api/cameras/demo-01/stream.m3u8",
  };

  const isOnline = activeCamera.status === "online";

  // Stream state & integration hook (for WebRTC / HLS)
  const {
    videoRef,
    connectionStatus,
    streamMode,
    setStreamMode,
    errorMessage,
    streamLatency,
    retryConnection,
    isLiveFeed,
  } = useLiveStream(activeCamera, { preferredMode: "auto" });

  // ---------------------------------------------------------------------------
  // Attach webcam stream to <video> when provided
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const vid = webcamVideoRef.current;
    if (!vid) return;
    if (webcamStream) {
      vid.srcObject = webcamStream;
      vid.play().catch(() => {/* autoplay blocked — muted so should not happen */});
    } else {
      vid.srcObject = null;
    }
  }, [webcamStream]);

  // ---------------------------------------------------------------------------
  // Live timestamp ticker
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Fullscreen
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handle = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch { /* silent */ }
  };

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const hudInfo = ANALYSIS_HUD[analysisState] ?? ANALYSIS_HUD["IDLE"];

  // Which video element is "active"
  const showWebcam = sourceType === "webcam" && !!webcamStream;
  const showLiveHLS = !showWebcam && isLiveFeed;

  // Top-left HUD label
  const feedLabel = (() => {
    if (sourceType === "webcam" && webcamStream) return "WEBCAM ACTIVE";
    if (sourceType === "mp4" && mp4File) return `DEMO: ${mp4File.toUpperCase()}`;
    if (sourceType === "rtsp") return "RTSP STREAM";
    if (isLiveFeed) return "DEMO VIDEO ACTIVE";
    return hudInfo.label; // e.g. "SELECT VIDEO SOURCE" / "READY" etc.
  })();

  // ---------------------------------------------------------------------------
  // Connection badge
  // ---------------------------------------------------------------------------
  const renderConnectionBadge = () => {
    if (!isOnline) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase bg-slate-800/60 text-slate-400 border border-slate-700/50 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Offline
        </span>
      );
    }

    if (connectionStatus === "connecting") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1.5 animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Connecting...
        </span>
      );
    }

    if (connectionStatus === "live_webrtc") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase bg-[#35D07F]/10 text-[#35D07F] border border-[#35D07F]/25 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#35D07F] animate-ping" />
          Demo Video Active ({streamLatency}ms)
        </span>
      );
    }

    if (connectionStatus === "live_hls") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase bg-[#19D3C5]/10 text-[#19D3C5] border border-[#19D3C5]/25 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#19D3C5]" />
          Stream Active ({streamLatency}ms)
        </span>
      );
    }

    // Analysis state badge when no live stream
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase flex items-center gap-1.5 ${
          analysisState === "ANALYZING"
            ? "bg-[#35D07F]/10 text-[#35D07F] border border-[#35D07F]/25"
            : "bg-white/[0.03] text-slate-400 border border-white/[0.06] cursor-pointer hover:bg-white/[0.08] hover:text-slate-200 transition-colors"
        }`}
        onClick={analysisState !== "ANALYZING" ? retryConnection : undefined}
        title={analysisState !== "ANALYZING" ? "Click to retry live connection." : undefined}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${hudInfo.dot} ${hudInfo.pulse ? "animate-pulse" : ""}`} />
        {analysisState === "ANALYZING" ? "ANALYZING" : "Feed Standby"}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#101820] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 p-6 rounded-none border-none" : "p-4 sm:p-5"
      }`}
    >
      {/* ── Top Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06] mb-3">
        {/* Left: Camera identity */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {activeCamera.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 border border-white/[0.04]">
                {activeCamera.id}
              </span>
              {/* Demo mode pill */}
              {sourceType === "mp4" && mp4File && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <FileVideo className="w-2.5 h-2.5" />
                  DEMO
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-[#19D3C5]">
                <Compass className="w-3 h-3" />
                Sector: {activeCamera.sector?.toUpperCase() || "DEMO-A"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                SIMULATED LOCATION
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls + status badge */}
        <div className="flex items-center gap-2">
          {showControls && (
            <div className="flex items-center gap-1 bg-[#080D11]/60 p-1 rounded-xl border border-white/[0.06]">
              {/* Stream Settings */}
              <button
                type="button"
                onClick={() => setShowStreamSettings(!showStreamSettings)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  showStreamSettings
                    ? "bg-[#19D3C5]/15 text-[#19D3C5] border border-[#19D3C5]/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
                title="Configure stream source"
              >
                <Sliders className="w-3 h-3" />
                <span className="hidden sm:inline">Video Mode</span>
              </button>

              {/* Toggle Detections */}
              <button
                type="button"
                onClick={() => setShowDetections(!showDetections)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  showDetections
                    ? "bg-[#19D3C5]/15 text-[#19D3C5] border border-[#19D3C5]/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
                title="Toggle AI Bounding Boxes"
              >
                <Crosshair className="w-3 h-3" />
                <span className="hidden sm:inline">Boxes</span>
              </button>

              {/* Toggle Zone */}
              <button
                type="button"
                onClick={() => setShowZone(!showZone)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  showZone
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
                title="Toggle Restricted Zone Overlay"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Zone</span>
              </button>

              {/* Toggle Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#19D3C5] hover:bg-white/[0.04] transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {renderConnectionBadge()}
        </div>
      </div>

      {/* ── Stream Mode Config Drawer ── */}
      {showStreamSettings && (
        <div className="mb-3.5 p-3 rounded-xl bg-[#0C141C] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">STREAM PROTOCOL:</span>
            {(["auto", "webrtc", "hls", "mock"] as StreamMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setStreamMode(mode)}
                className={`px-2.5 py-1 rounded-lg uppercase font-semibold text-[11px] transition-all border ${
                  streamMode === mode
                    ? "bg-[#19D3C5] text-[#071011] border-[#19D3C5] shadow-sm shadow-[#19D3C5]/20 font-bold"
                    : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.06]"
                }`}
              >
                {mode === "auto" ? "Auto (WebRTC)" : mode === "mock" ? "Demo Video" : mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {errorMessage && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1 max-w-sm truncate" title={errorMessage}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errorMessage}
              </span>
            )}
            <button
              onClick={retryConnection}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] text-[11px] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-[#19D3C5]" />
              <span>Retry Connect</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Camera Switcher Strip ── */}
      {cameras.length > 1 && !isFullscreen && (
        <div className="flex items-center gap-2 mb-3.5 overflow-x-auto pb-1 scrollbar-none">
          {cameras.map((c) => {
            const isSelected = c.id === activeCamera.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCamera?.(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-[#19D3C5]/10 text-[#19D3C5] border-[#19D3C5]/30 font-semibold shadow-sm"
                    : "bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white border-white/[0.06]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    c.status === "online" ? "bg-[#35D07F]" : "bg-[#FF4D67]"
                  }`}
                />
                <span>{c.name}</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">[{c.sector}]</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main Video Viewport ── */}
      <div
        className={`feed relative flex-1 min-h-[280px] sm:min-h-[420px] bg-[#071011] rounded-xl overflow-hidden border border-white/[0.08] flex items-center justify-center ${
          isFullscreen ? "h-full" : ""
        }`}
      >
        {/* ── WebRTC / HLS video element ── */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            showLiveHLS ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* ── Webcam video element ── */}
        <video
          ref={webcamVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            showWebcam ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* ── Fallback background (no live signal) ── */}
        {!showLiveHLS && !showWebcam && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(25,211,197,0.04)_0%,rgba(7,16,17,0.98)_100%)] pointer-events-none z-0" />
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.5)_3px)] z-0" />
          </>
        )}

        {/* ── HUD: Top Left — feed state ── */}
        <div className="absolute top-3 left-4 font-mono text-[11px] text-[#19D3C5] flex flex-col gap-1 pointer-events-none z-20">
          <div
            className={`flex items-center gap-2 font-medium tracking-wide bg-[#071011]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.08] ${hudInfo.textColor}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${hudInfo.dot} ${hudInfo.pulse ? "animate-pulse" : ""}`}
            />
            <span>{feedLabel}</span>
          </div>
          <div className="text-[10px] text-slate-400 px-2.5">
            {analysisState === "ANALYZING"
              ? sourceType === "mp4"
                ? `MP4 · ${mp4File ?? "demo"}`
                : sourceType === "rtsp"
                ? "RTSP INPUT ACTIVE"
                : "WEBCAM INPUT ACTIVE"
              : "NO ACTIVE INPUT"}
          </div>
        </div>

        {/* ── HUD: Top Right — timestamp ── */}
        <div className="absolute top-3 right-4 font-mono text-right pointer-events-none z-20">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5 justify-end bg-[#071011]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.08]">
            <Clock className="w-3 h-3 text-[#19D3C5]" />
            <span>{currentTime}</span>
          </div>
          <div className="text-[10px] text-slate-400 px-2.5 pt-0.5">
            {showLiveHLS || showWebcam ? "FEED: SOURCE VERIFIED" : "FEED STATUS: STANDBY"}
          </div>
        </div>

        {/* ── Reticle ── */}
        <div className="absolute inset-0 m-auto w-12 h-12 border border-[#19D3C5]/20 rounded-full pointer-events-none flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#19D3C5]/40 rounded-full" />
        </div>

        {/* ── AI Overlays + telemetry ── */}
        {isOnline ? (
          <>
            {showDetections && analysisState === "ANALYZING" && (
              <DetectionOverlay
                showZone={showZone}
                zoneName="SIMULATED MONITORING ZONE (RESTRICTED)"
                showTracks={true}
              />
            )}

            {/* Analysis telemetry strip at bottom-left */}
            <div
              className={`absolute bottom-3 left-4 z-20 font-mono text-[10px] flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg transition-colors ${
                analysisState === "ANALYZING"
                  ? "text-[#35D07F] bg-[#071011]/90 border-[#35D07F]/30"
                  : "text-slate-500 bg-[#071011]/80 border-white/[0.06]"
              }`}
            >
              {analysisState === "ANALYZING" ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF8A2A]" />
                  <span>YOLO + BYTETRACK: ACTIVE</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{hudInfo.label}</span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-center p-8 text-slate-400 font-mono text-xs flex flex-col items-center gap-3 z-10">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg font-bold">
              !
            </div>
            <div className="text-sm font-semibold text-white">FEED CARRIER SIGNAL LOST</div>
            <div className="text-slate-400">Camera source ({activeCamera.source}) is currently offline or unreachable.</div>
            <div className="text-[10px] text-slate-500">CHECK CAMERA SOURCE OR RETRY CONNECTION</div>
          </div>
        )}

        {/* ── Bottom-right source tag ── */}
        <div className="absolute bottom-3 right-4 z-20 font-mono text-[10px] text-slate-400 bg-[#071011]/90 px-2.5 py-1.5 rounded-lg border border-white/[0.08] flex items-center gap-2 backdrop-blur-md">
          <span>SRC: {activeCamera.source}</span>
          {!showLiveHLS && !showWebcam && isOnline && (
            <button
              onClick={retryConnection}
              className="text-[#19D3C5] hover:text-[#35D07F] flex items-center gap-1 font-semibold transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Connect Live
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
