import RiskBadge, { normalizeSeverity } from "./RiskBadge";
import type { Alert } from "../types/alert";
import { formatTime } from "../utils/formatters";
import {
  Camera,
  Clock,
  Check,
  ChevronRight,
  FileSearch,
  Activity,
  AlertOctagon,
  ShieldCheck
} from "lucide-react";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onSelect?: (alert: Alert) => void;
  isSelected?: boolean;
}

export default function AlertCard({
  alert,
  onAcknowledge,
  onSelect,
  isSelected,
}: AlertCardProps) {
  const normSeverity = normalizeSeverity(alert.severity);

  // Compute or format risk score (0 - 1 or default based on severity)
  const riskScore =
    alert.risk_score ??
    (normSeverity === "CRITICAL"
      ? 0.94
      : normSeverity === "HIGH"
      ? 0.82
      : normSeverity === "SUSPICIOUS"
      ? 0.58
      : 0.28);

  const eventType =
    alert.event_type ||
    (alert.title.toLowerCase().includes("zone") || alert.title.toLowerCase().includes("restricted")
      ? "zone_intrusion"
      : alert.title.toLowerCase().includes("loiter")
      ? "loitering"
      : alert.title.toLowerCase().includes("group")
      ? "group_formation"
      : "perimeter_anomaly");

  const hasEvidence = Boolean(alert.evidence_path);
  const isOpen = alert.status === "open";

  return (
    <article
      onClick={() => onSelect?.(alert)}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "bg-[#16202b] border-[#3dd6c6]/60 shadow-lg shadow-[#3dd6c6]/5"
          : "bg-[#101820] border-[#243140] hover:border-[#3dd6c6]/40 hover:bg-[#16202b]/40"
      } ${
        normSeverity === "CRITICAL"
          ? "border-l-4 border-l-[#ff4d4d]"
          : normSeverity === "HIGH"
          ? "border-l-4 border-l-[#ff5a5a]"
          : normSeverity === "SUSPICIOUS"
          ? "border-l-4 border-l-[#f5b942]"
          : "border-l-4 border-l-[#5ad67a]"
      }`}
    >
      {/* Top Row: Severity, Risk Score, Status, Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <RiskBadge severity={normSeverity} />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0c141c] border border-[#243140] text-[#e8eef5]">
            RISK: <span className={normSeverity === "CRITICAL" || normSeverity === "HIGH" ? "text-[#ff5a5a] font-bold" : "text-[#5ad67a]"}>{(riskScore * 100).toFixed(0)}%</span>
          </span>
          <span
            className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
              isOpen
                ? "bg-[#3a1515] text-[#ff5a5a] border border-[#ff5a5a]/30"
                : "bg-[#14321c] text-[#5ad67a] border border-[#5ad67a]/30"
            }`}
          >
            {alert.status}
          </span>
        </div>

        <span className="text-[10px] font-mono text-[#8fa3b8] flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#3dd6c6]" />
          {formatTime(alert.timestamp)}
        </span>
      </div>

      {/* Alert Title & Reason Summary */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-[#e8eef5] line-clamp-1 mb-1 flex items-center gap-1.5">
          {normSeverity === "CRITICAL" && <AlertOctagon className="w-4 h-4 text-[#ff4d4d] shrink-0" />}
          {alert.title}
        </h3>
        <p className="text-xs text-[#8fa3b8] line-clamp-2 leading-relaxed">
          {alert.description || alert.reason || "Autonomous behavior engine flag raised from live video surveillance."}
        </p>
      </div>

      {/* Metadata Row: Event Type, Camera ID, Evidence Availability */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#243140]/60 text-[10px] font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#3dd6c6]">
            <Camera className="w-3 h-3" />
            {alert.camera_id}
          </span>

          <span className="flex items-center gap-1 text-[#8fa3b8] bg-[#0c141c] px-2 py-0.5 rounded border border-[#243140]">
            <Activity className="w-3 h-3 text-[#f5b942]" />
            {eventType}
          </span>

          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
              hasEvidence
                ? "bg-[#14321c] text-[#5ad67a] border-[#5ad67a]/30"
                : "bg-[#0c141c] text-[#8fa3b8] border-[#243140]"
            }`}
          >
            {hasEvidence ? (
              <>
                <ShieldCheck className="w-3 h-3 text-[#5ad67a]" />
                <span>EVIDENCE READY</span>
              </>
            ) : (
              <>
                <FileSearch className="w-3 h-3 text-[#8fa3b8]" />
                <span>NO EVIDENCE CLIP</span>
              </>
            )}
          </span>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2">
          {isOpen && onAcknowledge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="px-2.5 py-1 rounded bg-[#16202b] hover:bg-[#5ad67a]/20 text-[#5ad67a] border border-[#5ad67a]/40 font-bold transition-all flex items-center gap-1"
              title="Acknowledge this incident"
            >
              <Check className="w-3 h-3" />
              Acknowledge
            </button>
          )}

          <span className="text-[#8fa3b8] hover:text-[#3dd6c6] flex items-center">
            Inspect <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </article>
  );
}
