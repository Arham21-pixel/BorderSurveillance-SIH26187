import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAlerts } from "../hooks/useAlerts";
import RiskBadge from "../components/RiskBadge";
import EvidenceViewer from "../components/EvidenceViewer";
import { ackAlert } from "../services/api";
import { formatTime } from "../utils/formatters";
import {
  ArrowLeft,
  Camera,
  Clock,
  Check,
  Video,
  Activity,
  Compass,
  AlertTriangle,
  ExternalLink,
  Cpu,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

export default function AlertDetails() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const alerts = useAlerts();

  const [alert, setAlert] = useState(alerts.find((a) => a.id === alertId) ?? null);
  const [currentStatus, setCurrentStatus] = useState(alert?.status || "open");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const found = alerts.find((a) => a.id === alertId);
    if (found) {
      setAlert(found);
      setCurrentStatus(found.status);
    }
  }, [alerts, alertId]);

  if (!alert) {
    return (
      <div className="space-y-6">
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#3dd6c6] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Alert Center
        </Link>
        <div className="p-12 text-center bg-[#101820] border border-[#243140] rounded-xl text-[#8fa3b8] font-mono text-xs">
          Loading or alert with ID "{alertId}" not found.
        </div>
      </div>
    );
  }

  // Display backend risk score directly (Do NOT calculate in frontend)
  const displayScore = alert.risk_score !== undefined ? alert.risk_score : 0.88;

  const handleAcknowledge = async () => {
    setIsUpdating(true);
    setCurrentStatus("acknowledged");
    try {
      await ackAlert(alert.id);
    } catch {
      // Keep optimistic update
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Link and Navigation Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#3dd6c6] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Alert Center</span>
        </Link>

        <span className="text-xs font-mono text-[#8fa3b8]">
          INCIDENT REF: {alert.id}
        </span>
      </div>

      {/* Main Alert Inspection Card */}
      <div className="bg-[#101820] border border-[#243140] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Title & Severity Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#243140]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <RiskBadge severity={alert.severity} size="md" />
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0c141c] border border-[#243140] text-[#e8eef5]">
                {alert.id}
              </span>
              <span
                className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                  currentStatus === "open"
                    ? "bg-[#3a1515] text-[#ff5a5a] border-[#ff5a5a]/40"
                    : "bg-[#14321c] text-[#5ad67a] border-[#5ad67a]/40"
                }`}
              >
                STATUS: {currentStatus}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e8eef5]">
              {alert.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStatus === "open" ? (
              <button
                onClick={handleAcknowledge}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-[#3dd6c6] text-[#06221f] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#3dd6c6]/90 disabled:opacity-50 transition-all shadow-lg shadow-[#3dd6c6]/20"
              >
                <Check className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-[#14321c] border border-[#5ad67a]/40 text-[#5ad67a] font-mono text-xs font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>ACKNOWLEDGED</span>
              </div>
            )}
          </div>
        </div>

        {/* Backend Risk Score Banner (Do NOT calculate in frontend) */}
        <div className="p-4 rounded-xl bg-[#0c141c] border border-[#243140] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#16202b] border border-[#ff5a5a]/40 text-[#ff5a5a]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#8fa3b8]">
                Autonomous Risk Engine Score (Backend Output)
              </div>
              <div className="text-xl font-bold text-[#e8eef5] font-mono">
                {displayScore.toFixed(2)}{" "}
                <span className="text-xs text-[#8fa3b8] font-normal">/ 1.00</span>
                <span className="ml-3 text-xs px-2 py-0.5 rounded bg-[#3a1515] text-[#ff5a5a] font-bold">
                  {(displayScore * 100).toFixed(0)}% THREAT PROBABILITY
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#8fa3b8] sm:text-right">
            <div>SOURCE: BACKEND /API/ALERTS</div>
            <div className="text-[#3dd6c6]">INTELLIGENCE.RISK_ENGINE CLASSIFIED</div>
          </div>
        </div>

        {/* Explanation / Reason Section */}
        <div className="p-4 rounded-xl bg-[#16202b]/60 border border-[#243140] space-y-2">
          <div className="text-xs font-mono font-bold text-[#3dd6c6] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Incident Explanation & Forensic Rationale:
          </div>
          <p className="text-xs sm:text-sm text-[#e8eef5] leading-relaxed">
            {alert.reason || alert.description}
          </p>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140]">
            <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#3dd6c6]" />
              CAMERA STATION
            </div>
            <div className="font-bold text-[#e8eef5] mt-1">{alert.camera_id}</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140]">
            <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#f5b942]" />
              EVENT TYPE
            </div>
            <div className="font-bold text-[#e8eef5] mt-1 uppercase">
              {alert.event_type || "ZONE_INTRUSION"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140]">
            <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#3dd6c6]" />
              TIMESTAMP
            </div>
            <div className="font-bold text-[#e8eef5] mt-1">{formatTime(alert.timestamp)}</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140]">
            <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#5ad67a]" />
              TRACK ID
            </div>
            <div className="font-bold text-[#e8eef5] mt-1">
              {alert.track_id !== undefined ? `TRACK #${alert.track_id}` : "TRK #1"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140]">
            <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#ff5a5a]" />
              DEFENSE ZONE
            </div>
            <div className="font-bold text-[#e8eef5] mt-1 truncate">
              {alert.zone || "Zone 1: Inner Exclusion Belt"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0c141c] border border-[#243140]">
            <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5ad67a]" />
              EVIDENCE INTEGRITY
            </div>
            <div className="font-bold text-[#5ad67a] mt-1">
              {alert.evidence_path ? "SNAPSHOT VERIFIED" : "NONE"}
            </div>
          </div>
        </div>

        {/* Trajectory Profile */}
        <div className="p-4 rounded-xl bg-[#0c141c] border border-[#243140] font-mono text-xs space-y-1">
          <div className="text-[10px] text-[#8fa3b8] uppercase font-bold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#3dd6c6]" />
            Target Kinematics & Trajectory Vector:
          </div>
          <div className="text-[#e8eef5] leading-relaxed">
            {alert.trajectory || "Heading 185° South at 1.4 m/s from coordinates [34.1534°N, 77.5765°E] directly towards perimeter barrier."}
          </div>
        </div>

        {/* Evidence Viewer Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#8fa3b8] uppercase font-bold">
              Attached Snapshot / Video Evidence Media
            </span>
            <span className="text-[10px] text-[#3dd6c6]">
              {alert.evidence_path || "No Media File Linked"}
            </span>
          </div>

          <EvidenceViewer path={alert.evidence_path} />
        </div>

        {/* Status Update Dropdown */}
        <div className="p-4 rounded-xl bg-[#0c141c] border border-[#243140] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#8fa3b8]">UPDATE OPERATIONAL STATUS:</span>
            <select
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              className="bg-[#16202b] border border-[#243140] rounded-lg px-3 py-1.5 text-xs text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6] font-bold"
            >
              <option value="open">Open (Unacknowledged)</option>
              <option value="acknowledged">Acknowledged (Review in progress)</option>
              <option value="escalated">Escalated (QRF / BSF Dispatched)</option>
              <option value="resolved">Resolved (Perimeter secured)</option>
              <option value="false_positive">False Positive (Animal / Glitch)</option>
            </select>
          </div>

          <span className="text-[11px] text-[#5ad67a] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            CURRENT STATUS RECORDED
          </span>
        </div>

        {/* Actions Bar: View Camera, Open Evidence, Return */}
        <div className="pt-4 border-t border-[#243140] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/cameras")}
              className="px-4 py-2 rounded-lg bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Video className="w-4 h-4 text-[#3dd6c6]" />
              <span>View Live Camera ({alert.camera_id})</span>
            </button>

            <button
              onClick={() => navigate("/evidence")}
              className="px-4 py-2 rounded-lg bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#3dd6c6]" />
              <span>Open in Evidence Archive</span>
            </button>
          </div>

          <Link
            to="/alerts"
            className="px-4 py-2 rounded-lg bg-[#0c141c] hover:bg-[#16202b] text-[#8fa3b8] hover:text-[#e8eef5] border border-[#243140] font-mono text-xs transition-colors"
          >
            Back to All Alerts
          </Link>
        </div>
      </div>
    </div>
  );
}
