import { useMemo } from "react";
import type { Detection } from "../types/detection";

interface DetectionOverlayProps {
  detections?: Detection[];
  showZone?: boolean;
  zoneName?: string;
  showTracks?: boolean;
}

export default function DetectionOverlay({
  detections,
  showZone = true,
  zoneName = "RESTRICTED BELT (100M ZONE)",
  showTracks = true,
}: DetectionOverlayProps) {
  const activeDetections = useMemo(() => {
    return detections || [];
  }, [detections]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Zone Overlay Support: Restricted Exclusion Boundary */}
      {showZone && (
        <div
          className="absolute border-2 border-dashed border-rose-500/60 bg-rose-500/[0.04] rounded-lg transition-all duration-300"
          style={{
            left: "15%",
            top: "18%",
            width: "72%",
            height: "68%",
          }}
        >
          <div className="absolute -top-3.5 left-3 px-2.5 py-0.5 rounded-full bg-[#080D11]/90 border border-rose-500/50 text-[10px] font-mono font-semibold text-rose-400 uppercase tracking-wider shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            {zoneName}
          </div>
        </div>
      )}

      {/* Detection Bounding Boxes & Track ID Support */}
      {activeDetections.map((det, index) => {
        // Convert normalized coordinates (0-1) to CSS percentage positions
        const left = `${Math.min(det.bbox.x1, det.bbox.x2) * 100}%`;
        const top = `${Math.min(det.bbox.y1, det.bbox.y2) * 100}%`;
        const width = `${Math.abs(det.bbox.x2 - det.bbox.x1) * 100}%`;
        const height = `${Math.abs(det.bbox.y2 - det.bbox.y1) * 100}%`;

        return (
          <div
            key={index}
            className="absolute border-2 border-[#20D5C5] bg-[#20D5C5]/10 shadow-[0_0_12px_rgba(32,213,197,0.3)] transition-all duration-150 rounded-sm"
            style={{ left, top, width, height }}
          >
            {/* Corner brackets */}
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#20D5C5]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#20D5C5]" />
            <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#20D5C5]" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#20D5C5]" />

            {/* Target Label, Confidence & Track ID badge */}
            <div className="absolute -top-6 left-0 px-2 py-0.5 rounded-md bg-[#080D11]/95 border border-[#20D5C5]/60 text-[10px] font-mono text-[#20D5C5] font-semibold whitespace-nowrap flex items-center gap-1.5 shadow-xl backdrop-blur-md">
              {showTracks && det.track_id !== undefined && (
                <span className="text-slate-300 bg-white/[0.08] px-1 rounded text-[9px]">
                  ID #{det.track_id}
                </span>
              )}
              <span className="uppercase tracking-wide font-bold">{det.label}</span>
              <span className="text-[9px] text-[#39D98A] font-bold">
                {(det.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
