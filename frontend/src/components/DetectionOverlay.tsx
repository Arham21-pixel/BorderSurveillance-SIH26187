import { useMemo } from "react";
import type { Detection } from "../types/detection";

interface DetectionOverlayProps {
  detections?: Detection[];
  showZone?: boolean;
  zoneName?: string;
  showTracks?: boolean;
}

// Sample detections for camera feeds when live detections are streaming or in demo mode
const defaultSampleDetections: Detection[] = [
  {
    track_id: 1,
    label: "person",
    confidence: 0.88,
    bbox: { x1: 0.22, y1: 0.25, x2: 0.38, y2: 0.72 },
  },
  {
    track_id: 2,
    label: "person",
    confidence: 0.79,
    bbox: { x1: 0.42, y1: 0.30, x2: 0.54, y2: 0.68 },
  },
];

export default function DetectionOverlay({
  detections,
  showZone = true,
  zoneName = "RESTRICTED BELT (100M ZONE)",
  showTracks = true,
}: DetectionOverlayProps) {
  const activeDetections = useMemo(() => {
    if (detections && detections.length > 0) return detections;
    return defaultSampleDetections;
  }, [detections]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Zone Overlay Support: Restricted Exclusion Boundary */}
      {showZone && (
        <div
          className="absolute border-2 border-dashed border-[#ff5a5a]/60 bg-[#ff5a5a]/5 rounded-sm"
          style={{
            left: "15%",
            top: "18%",
            width: "72%",
            height: "68%",
          }}
        >
          <div className="absolute -top-5 left-2 px-2 py-0.5 rounded bg-[#3a1515] border border-[#ff5a5a]/50 text-[10px] font-mono font-bold text-[#ff5a5a] uppercase tracking-wider shadow-sm">
            ⚠ {zoneName}
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
            className="absolute border-2 border-[#3dd6c6] bg-[#3dd6c6]/10 shadow-[0_0_8px_rgba(61,214,198,0.4)] transition-all duration-150"
            style={{ left, top, width, height }}
          >
            {/* Corner crosshairs */}
            <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#3dd6c6]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#3dd6c6]" />
            <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#3dd6c6]" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#3dd6c6]" />

            {/* Target Label, Confidence & Track ID badge */}
            <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-[#101820] border border-[#3dd6c6] text-[10px] font-mono text-[#3dd6c6] font-bold whitespace-nowrap flex items-center gap-1.5 shadow">
              {showTracks && det.track_id !== undefined && (
                <span className="text-[#e8eef5] bg-[#16202b] px-1 rounded text-[9px]">
                  TRK #{det.track_id}
                </span>
              )}
              <span className="uppercase">{det.label}</span>
              <span className="text-[9px] text-[#5ad67a]">
                {(det.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
