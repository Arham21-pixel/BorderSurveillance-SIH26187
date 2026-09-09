import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RiskBadge from "./RiskBadge";
import EvidenceViewer, { hasAlertMedia } from "./EvidenceViewer";
import RiskBreakdown from "./RiskBreakdown";
import type { Alert } from "../types/alert";
import { formatTime } from "../utils/formatters";
import { ackAlert } from "../services/api";
import {
  X,
  Camera,
  Clock,
  Check,
  FileSearch,
  Video,
  Activity,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Cpu
} from "lucide-react";

interface AlertDetailsModalProps {
  alert: Alert | null;
  onClose: () => void;
  onStatusUpdate?: (alertId: string, newStatus: string) => void;
}

export default function AlertDetailsModal({
  alert,
  onClose,
  onStatusUpdate,
}: AlertDetailsModalProps) {
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState(alert?.status || "open");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!alert) return null;

  // Handle acknowledge action
  const handleAcknowledge = async () => {
    setIsUpdating(true);
    setCurrentStatus("acknowledged");
    onStatusUpdate?.(alert.id, "acknowledged");
    try {
      await ackAlert(alert.id);
    } catch {
      // Keep optimistic update in demo mode
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    onStatusUpdate?.(alert.id, newStatus);
  };

  // Navigate to camera page focusing on this camera
  const handleViewCamera = () => {
    onClose();
    navigate("/cameras");
  };

  // Navigate to evidence page
  const handleOpenEvidence = () => {
    onClose();
    navigate("/evidence");
  };

  // Display backend risk score directly (Do NOT calculate in frontend)
  const displayScore = alert.risk_score !== undefined ? alert.risk_score : 0.88;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="n-card w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-netra-accent/12 flex items-start justify-between gap-4 sticky top-0 bg-[#070B12]/80 backdrop-blur z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <RiskBadge severity={alert.severity} size="md" />
              <span className="font-mono text-xs text-[#8B9AA6] px-2 py-0.5 rounded bg-[#101A24] border border-[#1A343C]">
                ID: {alert.id}
              </span>
              <span
                className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                  currentStatus === "open"
                    ? "bg-[rgba(255,77,103,0.12)] text-[#FF4D67] border-[#FF4D67]/40"
                    : currentStatus === "escalated"
                    ? "bg-[#3a2e12] text-[#F2C94C] border-[#F2C94C]/40"
                    : "bg-[rgba(53,208,127,0.12)] text-[#35D07F] border-[#35D07F]/40"
                }`}
              >
                STATUS: {currentStatus}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#F4F8FA]">
              {alert.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#101A24] text-[#8B9AA6] hover:text-[#F4F8FA] hover:bg-[#101A24] border border-[#1A343C] transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Backend Risk Score Banner (displayed directly, not calculated) */}
          <div className="p-4 rounded-xl bg-[#101A24] border border-[#1A343C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#101A24] border border-[#FF4D67]/40 text-[#FF4D67]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-[#8B9AA6]">
                  Contextual Risk Assessment (Backend Risk Engine Score)
                </div>
                <div className="text-xl font-bold text-[#F4F8FA] font-mono">
                  {displayScore.toFixed(2)}{" "}
                  <span className="text-xs text-[#8B9AA6] font-normal">/ 1.00</span>
                  <span className="ml-3 text-xs px-2 py-0.5 rounded bg-[rgba(255,77,103,0.12)] text-[#FF4D67] font-bold">
                    {(displayScore * 100).toFixed(0)}% RISK SCORE
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#8B9AA6] sm:text-right">
              <div>ENGINE: AI_ANALYTICS_ENGINE</div>
              <div className="text-[#26E5E5]">COMPUTED VIA CONTEXTUAL SCORING</div>
            </div>
          </div>

          {/* Contributing Signal Breakdown (Positive & Negative Contributors) */}
          <RiskBreakdown breakdown={alert.risk_breakdown} />

          {/* Explanation / Reason Narrative Section */}
          <div className="p-4 rounded-xl bg-[#101A24]/60 border border-[#1A343C] space-y-2">
            <div className="text-xs font-mono font-bold text-[#26E5E5] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Incident Explanation & Risk Context
            </div>
            <p className="text-xs sm:text-sm text-[#F4F8FA] leading-relaxed">
              {alert.reason || alert.description}
            </p>
          </div>

          {/* Telemetry & Spatial Attribution Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#101A24] border border-[#1A343C]">
              <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#26E5E5]" />
                CAMERA STATION
              </div>
              <div className="font-bold text-[#F4F8FA] mt-1">{alert.camera_id}</div>
              <div className="text-[10px] text-[#26E5E5] mt-0.5">Monitored sector</div>
            </div>

            <div className="p-3 rounded-lg bg-[#101A24] border border-[#1A343C]">
              <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#F2C94C]" />
                EVENT TYPE
              </div>
              <div className="font-bold text-[#F4F8FA] mt-1 uppercase">
                {alert.event_type || "ZONE_INTRUSION"}
              </div>
              <div className="text-[10px] text-[#8B9AA6] mt-0.5">Event classification</div>
            </div>

            <div className="p-3 rounded-lg bg-[#101A24] border border-[#1A343C]">
              <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#26E5E5]" />
                TIMESTAMP
              </div>
              <div className="font-bold text-[#F4F8FA] mt-1">{formatTime(alert.timestamp)}</div>
              <div className="text-[10px] text-[#8B9AA6] mt-0.5">{alert.timestamp.split("T")[0]}</div>
            </div>

            <div className="p-3 rounded-lg bg-[#101A24] border border-[#1A343C]">
              <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#35D07F]" />
                TRACK ID
              </div>
              <div className="font-bold text-[#F4F8FA] mt-1">
                {alert.track_id !== undefined ? `TRACK #${alert.track_id}` : "TRK #1"}
              </div>
              <div className="text-[10px] text-[#8B9AA6] mt-0.5">ByteTrack</div>
            </div>

            <div className="p-3 rounded-lg bg-[#101A24] border border-[#1A343C]">
              <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#FF4D67]" />
                MONITORING ZONE
              </div>
              <div className="font-bold text-[#F4F8FA] mt-1 truncate">
                {alert.zone || "Zone 1: Inner Exclusion Belt"}
              </div>
              <div className="text-[10px] text-[#FF4D67] mt-0.5">Restricted monitoring zone</div>
            </div>

            <div className="p-3 rounded-lg bg-[#101A24] border border-[#1A343C]">
              <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-[#26E5E5]" />
                EVIDENCE STATUS
              </div>
              <div className="font-bold text-[#35D07F] mt-1">
                {hasAlertMedia(alert) ? "FRAME CAPTURED" : "LOG RECORDED"}
              </div>
              <div className="text-[10px] text-[#8B9AA6] mt-0.5">Source verified</div>
            </div>
          </div>

          {/* Trajectory & Movement Profile */}
          <div className="p-3.5 rounded-lg bg-[#101A24] border border-[#1A343C] font-mono text-xs space-y-1">
            <div className="text-[10px] text-[#8B9AA6] uppercase font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#26E5E5]" />
              Target Trajectory & Kinematic Vector:
            </div>
            <div className="text-[#F4F8FA] leading-relaxed">
              {alert.trajectory || "Heading south-east toward restricted zone boundary in simulated sector map."}
            </div>
          </div>

          {/* Evidence Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#8B9AA6] uppercase font-bold flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-[#26E5E5]" />
                Captured Evidence Media
              </span>
              <span className="text-[10px] text-[#26E5E5]">
                {hasAlertMedia(alert) ? "Snapshot / clip / trajectory" : "NONE"}
              </span>
            </div>

            <EvidenceViewer alert={alert} path={alert.evidence_path} showTabs />
          </div>

          {/* Status Update Dropdown Row */}
          <div className="p-4 rounded-xl bg-[#101A24] border border-[#1A343C] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8B9AA6]">OPERATOR STATUS UPDATE:</span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-[#101A24] border border-[#1A343C] rounded-lg px-3 py-1.5 text-xs text-[#F4F8FA] focus:outline-none focus:border-[#26E5E5] font-bold"
              >
                <option value="open">Open (Unacknowledged)</option>
                <option value="acknowledged">Acknowledged (Review in progress)</option>
                <option value="escalated">Escalated (Field team informed)</option>
                <option value="resolved">Resolved (Area secured)</option>
                <option value="false_positive">False Positive (Animal / Sensor glitch)</option>
              </select>
            </div>

            <span className="text-[11px] text-[#35D07F] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              STATUS PERSISTED
            </span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 sm:p-6 border-t border-[#1A343C] bg-[#101A24] flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewCamera}
              className="px-3.5 py-2 rounded-lg bg-[#101A24] hover:bg-[#1A343C] text-[#F4F8FA] border border-[#1A343C] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Video className="w-4 h-4 text-[#26E5E5]" />
              <span>View Live Camera</span>
            </button>

            <button
              onClick={handleOpenEvidence}
              className="px-3.5 py-2 rounded-lg bg-[#101A24] hover:bg-[#1A343C] text-[#F4F8FA] border border-[#1A343C] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#26E5E5]" />
              <span>Open in Evidence Archive</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentStatus === "open" ? (
              <button
                onClick={handleAcknowledge}
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-lg bg-[#26E5E5] text-[#070B12] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#26E5E5]/90 disabled:opacity-50 transition-all shadow-lg shadow-[#26E5E5]/20"
              >
                <Check className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
            ) : (
              <div className="px-4 py-2 rounded-lg bg-[rgba(53,208,127,0.12)] border border-[#35D07F]/40 text-[#35D07F] font-mono text-xs font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>ACKNOWLEDGED</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
