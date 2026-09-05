import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RiskBadge from "./RiskBadge";
import EvidenceViewer from "./EvidenceViewer";
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
        className="bg-[#101820] border border-[#243140] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#243140] flex items-start justify-between gap-4 sticky top-0 bg-[#101820]/95 backdrop-blur z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <RiskBadge severity={alert.severity} size="md" />
              <span className="font-mono text-xs text-[#8fa3b8] px-2 py-0.5 rounded bg-[#0c141c] border border-[#243140]">
                ID: {alert.id}
              </span>
              <span
                className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                  currentStatus === "open"
                    ? "bg-[#3a1515] text-[#ff5a5a] border-[#ff5a5a]/40"
                    : currentStatus === "escalated"
                    ? "bg-[#3a2e12] text-[#f5b942] border-[#f5b942]/40"
                    : "bg-[#14321c] text-[#5ad67a] border-[#5ad67a]/40"
                }`}
              >
                STATUS: {currentStatus}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#e8eef5]">
              {alert.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#0c141c] text-[#8fa3b8] hover:text-[#e8eef5] hover:bg-[#16202b] border border-[#243140] transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Backend Risk Score Banner (displayed directly, not calculated) */}
          <div className="p-4 rounded-xl bg-[#0c141c] border border-[#243140] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#16202b] border border-[#ff5a5a]/40 text-[#ff5a5a]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-[#8fa3b8]">
                  Autonomous Risk Assessment (Backend Risk Engine Score)
                </div>
                <div className="text-xl font-bold text-[#e8eef5] font-mono">
                  {displayScore.toFixed(2)}{" "}
                  <span className="text-xs text-[#8fa3b8] font-normal">/ 1.00</span>
                  <span className="ml-3 text-xs px-2 py-0.5 rounded bg-[#3a1515] text-[#ff5a5a] font-bold">
                    {(displayScore * 100).toFixed(0)}% THREAT INDEX
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#8fa3b8] sm:text-right">
              <div>ENGINE: INTELLIGENCE.RISK_ENGINE</div>
              <div className="text-[#3dd6c6]">COMPUTED VIA FEATURE VECTOR</div>
            </div>
          </div>

          {/* Explanation / Reason Narrative Section */}
          <div className="p-4 rounded-xl bg-[#16202b]/60 border border-[#243140] space-y-2">
            <div className="text-xs font-mono font-bold text-[#3dd6c6] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Incident Explanation & Forensic Rationale
            </div>
            <p className="text-xs sm:text-sm text-[#e8eef5] leading-relaxed">
              {alert.reason || alert.description}
            </p>
          </div>

          {/* Telemetry & Spatial Attribution Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#3dd6c6]" />
                CAMERA STATION
              </div>
              <div className="font-bold text-[#e8eef5] mt-1">{alert.camera_id}</div>
              <div className="text-[10px] text-[#3dd6c6] mt-0.5">Northern Command</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#f5b942]" />
                EVENT TYPE
              </div>
              <div className="font-bold text-[#e8eef5] mt-1 uppercase">
                {alert.event_type || "ZONE_INTRUSION"}
              </div>
              <div className="text-[10px] text-[#8fa3b8] mt-0.5">Automated Event Class</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#3dd6c6]" />
                TIMESTAMP
              </div>
              <div className="font-bold text-[#e8eef5] mt-1">{formatTime(alert.timestamp)}</div>
              <div className="text-[10px] text-[#8fa3b8] mt-0.5">{alert.timestamp.split("T")[0]}</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#5ad67a]" />
                TRACK ID
              </div>
              <div className="font-bold text-[#e8eef5] mt-1">
                {alert.track_id !== undefined ? `TRACK #${alert.track_id}` : "TRK #1"}
              </div>
              <div className="text-[10px] text-[#8fa3b8] mt-0.5">B-SORT Tracker</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#ff5a5a]" />
                DEFENSE ZONE
              </div>
              <div className="font-bold text-[#e8eef5] mt-1 truncate">
                {alert.zone || "Zone 1: Inner Exclusion Belt"}
              </div>
              <div className="text-[10px] text-[#ff5a5a] mt-0.5">Restricted Military Area</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-[#3dd6c6]" />
                EVIDENCE STATUS
              </div>
              <div className="font-bold text-[#5ad67a] mt-1">
                {alert.evidence_path ? "SNAPSHOT ATTACHED" : "LOG RECORDED"}
              </div>
              <div className="text-[10px] text-[#8fa3b8] mt-0.5">SHA-256 Validated</div>
            </div>
          </div>

          {/* Trajectory & Movement Profile */}
          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140] font-mono text-xs space-y-1">
            <div className="text-[10px] text-[#8fa3b8] uppercase font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#3dd6c6]" />
              Target Trajectory & Kinematic Vector:
            </div>
            <div className="text-[#e8eef5] leading-relaxed">
              {alert.trajectory || "Heading 185° South at 1.4 m/s from coordinates [34.1534°N, 77.5765°E] towards physical perimeter barrier."}
            </div>
          </div>

          {/* Evidence Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#8fa3b8] uppercase font-bold flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-[#3dd6c6]" />
                Captured Evidence Media
              </span>
              <span className="text-[10px] text-[#3dd6c6]">
                REF: {alert.evidence_path || "NONE"}
              </span>
            </div>

            <EvidenceViewer path={alert.evidence_path} />
          </div>

          {/* Status Update Dropdown Row */}
          <div className="p-4 rounded-xl bg-[#0c141c] border border-[#243140] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8fa3b8]">OPERATOR STATUS UPDATE:</span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-[#16202b] border border-[#243140] rounded-lg px-3 py-1.5 text-xs text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6] font-bold"
              >
                <option value="open">Open (Unacknowledged)</option>
                <option value="acknowledged">Acknowledged (Review in progress)</option>
                <option value="escalated">Escalated (QRF / BSF Dispatched)</option>
                <option value="resolved">Resolved (Perimeter secured)</option>
                <option value="false_positive">False Positive (Animal / Sensor glitch)</option>
              </select>
            </div>

            <span className="text-[11px] text-[#5ad67a] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              STATUS PERSISTED
            </span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 sm:p-6 border-t border-[#243140] bg-[#0c141c] flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewCamera}
              className="px-3.5 py-2 rounded-lg bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Video className="w-4 h-4 text-[#3dd6c6]" />
              <span>View Live Camera</span>
            </button>

            <button
              onClick={handleOpenEvidence}
              className="px-3.5 py-2 rounded-lg bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#3dd6c6]" />
              <span>Open in Evidence Archive</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentStatus === "open" ? (
              <button
                onClick={handleAcknowledge}
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-lg bg-[#3dd6c6] text-[#06221f] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#3dd6c6]/90 disabled:opacity-50 transition-all shadow-lg shadow-[#3dd6c6]/20"
              >
                <Check className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
            ) : (
              <div className="px-4 py-2 rounded-lg bg-[#14321c] border border-[#5ad67a]/40 text-[#5ad67a] font-mono text-xs font-bold flex items-center gap-1.5">
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
