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
      className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-[#141E28] border-[#20D5C5]/40 shadow-lg shadow-black/40"
          : "bg-[#101820] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#141E28]/50"
      }`}
    >
      {/* Subtle indicator strip on left */}
      <span
        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
          normSeverity === "CRITICAL"
            ? "bg-rose-500"
            : normSeverity === "HIGH"
            ? "bg-orange-500"
            : normSeverity === "SUSPICIOUS"
            ? "bg-amber-500"
            : "bg-[#39D98A]"
        }`}
      />

      {/* Top Row: Severity, Risk Score, Status, Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pl-2">
        <div className="flex items-center gap-2">
          <RiskBadge severity={normSeverity} />
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-300">
            Risk <span className={normSeverity === "CRITICAL" || normSeverity === "HIGH" ? "text-rose-400 font-semibold" : "text-[#39D98A] font-semibold"}>{(riskScore * 100).toFixed(0)}%</span>
          </span>
          <span
            className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
              isOpen
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {alert.status}
          </span>
        </div>

        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#20D5C5]" />
          {formatTime(alert.timestamp)}
        </span>
      </div>

      {/* Alert Title & Reason Summary */}
      <div className="mb-2.5 pl-2">
        <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
          {alert.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {alert.description || alert.reason || "Autonomous behavior engine flag raised from live video surveillance."}
        </p>
      </div>

      {/* Metadata Row: Event Type, Camera ID, Evidence Availability, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.05] text-[11px] pl-2">
        <div className="flex flex-wrap items-center gap-2 text-slate-400">
          <span className="flex items-center gap-1 font-mono text-[#20D5C5] bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.04]">
            <Camera className="w-3 h-3" />
            {alert.camera_id}
          </span>

          <span className="flex items-center gap-1 font-mono text-slate-400 bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.04]">
            <Activity className="w-3 h-3 text-amber-400/80" />
            {eventType}
          </span>

          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
              hasEvidence
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-white/[0.02] text-slate-400 border-white/[0.04]"
            }`}
          >
            {hasEvidence ? (
              <>
                <ShieldCheck className="w-3 h-3 text-[#39D98A]" />
                <span>Evidence Ready</span>
              </>
            ) : (
              <>
                <FileSearch className="w-3 h-3 text-slate-400" />
                <span>No Evidence Clip</span>
              </>
            )}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isOpen && onAcknowledge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#39D98A]/10 hover:bg-[#39D98A]/20 text-[#39D98A] border border-[#39D98A]/30 text-xs font-medium transition-all flex items-center gap-1 shadow-sm"
              title="Acknowledge this incident"
            >
              <Check className="w-3 h-3" />
              Acknowledge
            </button>
          )}

          <span className="text-xs font-medium text-slate-400 hover:text-[#20D5C5] transition-colors flex items-center gap-0.5">
            Inspect <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
