import { useState, useEffect, useRef } from "react";
import DetectionOverlay from "./DetectionOverlay";
import type { Camera } from "../types/camera";
import {
  Video,
  Radio,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Layers,
  Crosshair,
  MapPin,
  Clock,
  Compass
} from "lucide-react";

interface CameraFeedProps {
  title?: string;
  camera?: Camera;
  cameras?: Camera[];
  onSelectCamera?: (camera: Camera) => void;
  showControls?: boolean;
}

export default function CameraFeed({
  title,
  camera,
  cameras = [],
  onSelectCamera,
  showControls = true,
}: CameraFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetections, setShowDetections] = useState(true);
  const [showZone, setShowZone] = useState(true);

  const activeCamera = camera ?? cameras[0] ?? {
    id: "cam-north-01",
    name: title || "North Fence 01",
    sector: "north",
    status: "online",
    source: "0",
    latitude: 34.1526,
    longitude: 77.5771,
  };

  const isOnline = activeCamera.status === "online";

  // Live timestamp timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#101820] border border-[#243140] rounded-xl overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-0 z-50 p-6 rounded-none border-none" : "p-4 sm:p-5"
      }`}
    >
      {/* Top Header: Camera Name, Location, Status, and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#243140] mb-3">
        {/* Left: Camera Identity & Coordinates */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0c141c] border border-[#243140] text-[#3dd6c6]">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#e8eef5] uppercase">
                {activeCamera.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#16202b] text-[#8fa3b8]">
                {activeCamera.id}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#8fa3b8] mt-0.5">
              <span className="flex items-center gap-1 text-[#3dd6c6]">
                <Compass className="w-3 h-3" />
                Sector: {activeCamera.sector?.toUpperCase() || "NORTH"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activeCamera.latitude ? `${activeCamera.latitude.toFixed(4)}°N, ${activeCamera.longitude?.toFixed(4)}°E` : "34.1526°N, 77.5771°E"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Controls Toolbar */}
        <div className="flex items-center gap-2">
          {showControls && (
            <div className="flex items-center gap-1.5 bg-[#0c141c] p-1 rounded-lg border border-[#243140]">
              {/* Toggle Detections */}
              <button
                type="button"
                onClick={() => setShowDetections(!showDetections)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  showDetections
                    ? "bg-[#16202b] text-[#3dd6c6] border border-[#3dd6c6]/40 font-bold"
                    : "text-[#8fa3b8] hover:text-[#e8eef5]"
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
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  showZone
                    ? "bg-[#16202b] text-[#ff5a5a] border border-[#ff5a5a]/40 font-bold"
                    : "text-[#8fa3b8] hover:text-[#e8eef5]"
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
                className="p-1.5 rounded text-[#8fa3b8] hover:text-[#3dd6c6] hover:bg-[#16202b] transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isOnline
                ? "bg-[#14321c] text-[#5ad67a] border border-[#5ad67a]/40"
                : "bg-[#2a2a2a] text-[#8fa3b8]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-[#5ad67a] animate-ping" : "bg-[#8fa3b8]"}`} />
            {isOnline ? "LIVE FEED" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Camera Switcher Strip (if multiple cameras provided) */}
      {cameras.length > 1 && !isFullscreen && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {cameras.map((c) => {
            const isSelected = c.id === activeCamera.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCamera?.(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-[#16202b] text-[#3dd6c6] border-[#3dd6c6]/50 font-bold shadow-sm"
                    : "bg-[#0c141c] text-[#8fa3b8] hover:bg-[#101820] hover:text-[#e8eef5] border-[#243140]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    c.status === "online" ? "bg-[#5ad67a]" : "bg-[#ff5a5a]"
                  }`}
                />
                <span>{c.name}</span>
                <span className="text-[10px] opacity-60 uppercase">[{c.sector}]</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Video / Live-Feed Viewport */}
      <div className={`feed relative flex-1 min-h-[280px] sm:min-h-[420px] bg-[#070b10] rounded-lg overflow-hidden border border-[#243140] flex items-center justify-center ${isFullscreen ? "h-full" : ""}`}>
        {/* Tactical Scanlines & Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(61,214,198,0.04)_0%,rgba(7,11,16,0.9)_100%)] pointer-events-none z-0" />
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.5)_3px)] z-0" />

        {/* Live HUD: Top Left Stream Diagnostics */}
        <div className="absolute top-3 left-4 font-mono text-[11px] text-[#3dd6c6] flex flex-col gap-1 pointer-events-none z-20">
          <div className="flex items-center gap-2 font-bold tracking-wider">
            <Radio className="w-3.5 h-3.5 text-[#ff5a5a] animate-pulse" />
            <span>CCTV STREAM · 1080P @ 30.0 FPS</span>
          </div>
          <div className="text-[10px] text-[#8fa3b8]">
            BITRATE: 4.2 MBPS · CODEC: H.264 · LATENCY: 22MS
          </div>
        </div>

        {/* Live HUD: Top Right Timestamp */}
        <div className="absolute top-3 right-4 font-mono text-right pointer-events-none z-20">
          <div className="text-xs font-semibold text-[#e8eef5] flex items-center gap-1.5 justify-end">
            <Clock className="w-3 h-3 text-[#3dd6c6]" />
            <span>{currentTime}</span>
          </div>
          <div className="text-[10px] text-[#8fa3b8]">FEED AUTH: CRYPTO-SIGNED</div>
        </div>

        {/* Live HUD: Center Reticle */}
        <div className="absolute inset-0 m-auto w-12 h-12 border border-[#3dd6c6]/20 rounded-full pointer-events-none flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#3dd6c6]/40 rounded-full" />
        </div>

        {/* AI Overlays (Detection Bounding Boxes + Zone) */}
        {isOnline ? (
          <>
            {showDetections && (
              <DetectionOverlay
                showZone={showZone}
                zoneName="NORTH PERIMETER BELT (EXCLUSION ZONE)"
                showTracks={true}
              />
            )}

            {/* Bottom Left AI Telemetry */}
            <div className="absolute bottom-3 left-4 z-20 font-mono text-[10px] text-[#5ad67a] flex items-center gap-2 bg-[#0c141c]/90 px-3 py-1.5 rounded-lg border border-[#5ad67a]/40 backdrop-blur">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ff5a5a]" />
              <span>YOLOv8 + SIMPLE-TRACKER: 2 ACTIVE TARGETS</span>
            </div>
          </>
        ) : (
          <div className="text-center p-8 text-[#8fa3b8] font-mono text-xs flex flex-col items-center gap-3 z-10">
            <div className="w-12 h-12 rounded-full bg-[#16202b] border border-[#ff5a5a]/40 flex items-center justify-center text-[#ff5a5a] text-lg font-bold">
              !
            </div>
            <div className="text-sm font-bold text-[#e8eef5]">FEED CARRIER SIGNAL LOST</div>
            <div>Camera source ({activeCamera.source}) is currently offline or unreachable.</div>
            <div className="text-[10px] text-[#8fa3b8]/60">CHECK RTSP STREAM ROUTE OR HARDWARE CONNECTION</div>
          </div>
        )}

        {/* Bottom Right Source Tag */}
        <div className="absolute bottom-3 right-4 z-20 font-mono text-[10px] text-[#8fa3b8] bg-[#0c141c]/90 px-2.5 py-1 rounded border border-[#243140]">
          SRC: {activeCamera.source}
        </div>
      </div>
    </div>
  );
}
