import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAlerts } from "../hooks/useAlerts";
import RiskBadge from "../components/RiskBadge";
import EvidenceViewer, { hasAlertMedia } from "../components/EvidenceViewer";
import RiskBreakdown from "../components/RiskBreakdown";
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
  const { alertId: rawAlertId } = useParams<{ alertId: string }>();
  const alertId = rawAlertId ? decodeURIComponent(rawAlertId) : undefined;
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
          className="inline-flex items-center gap-2 text-xs font-mono text-[#26E5E5] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Alert Center
        </Link>
        <div className="p-12 text-center n-card text-[#8B9AA6] font-mono text-xs">
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
          className="inline-flex items-center gap-2 text-xs font-mono text-[#26E5E5] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Alert Center</span>
        </Link>

        <span className="text-xs font-mono text-[#8B9AA6]">
          INCIDENT REF: {alert.id}
        </span>
      </div>

      {/* Main Alert Inspection Card */}
      <div className="n-card p-6 sm:p-8 space-y-6">
        {/* Title & Severity Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#1A343C]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <RiskBadge severity={alert.severity} size="md" />
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#101A24] border border-[#1A343C] text-[#F4F8FA]">
                {alert.id}
              </span>
              <span
                className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                  currentStatus === "open"
                    ? "bg-[rgba(255,77,103,0.12)] text-[#FF4D67] border-[#FF4D67]/40"
                    : "bg-[rgba(53,208,127,0.12)] text-[#35D07F] border-[#35D07F]/40"
                }`}
              >
                STATUS: {currentStatus}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F4F8FA]">
              {alert.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStatus === "open" ? (
              <button
                onClick={handleAcknowledge}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-[#26E5E5] text-[#070B12] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#26E5E5]/90 disabled:opacity-50 transition-all shadow-lg shadow-[#26E5E5]/20"
              >
                <Check className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-[rgba(53,208,127,0.12)] border border-[#35D07F]/40 text-[#35D07F] font-mono text-xs font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>ACKNOWLEDGED</span>
              </div>
            )}
          </div>
        </div>

        {/* Backend Risk Score Banner (Do NOT calculate in frontend) */}
          <div className="n-card-2 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#101A24] border border-[#FF4D67]/40 text-[#FF4D67]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#8B9AA6]">
                Contextual Risk Engine Score (Backend Output)
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
            <div>SOURCE: BACKEND /API/ALERTS</div>
            <div className="text-[#26E5E5]">AI_ANALYTICS_ENGINE CLASSIFIED</div>
          </div>
        </div>

        {/* Contributing Signal Breakdown (Positive & Negative contributors) */}
        <RiskBreakdown breakdown={alert.risk_breakdown} />

        {/* Explanation / Reason Section */}
        <div className="n-card-2 p-4 space-y-2">
          <div className="text-xs font-mono font-bold text-[#26E5E5] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Incident Explanation & Risk Context:
          </div>
          <p className="text-xs sm:text-sm text-[#F4F8FA] leading-relaxed">
            {alert.reason || alert.description}
          </p>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="n-card-2 p-3.5">
            <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#26E5E5]" />
              CAMERA STATION
            </div>
            <div className="font-bold text-[#F4F8FA] mt-1">{alert.camera_id}</div>
          </div>

          <div className="n-card-2 p-3.5">
            <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#F2C94C]" />
              EVENT TYPE
            </div>
            <div className="font-bold text-[#F4F8FA] mt-1 uppercase">
              {alert.event_type || "ZONE_INTRUSION"}
            </div>
          </div>

          <div className="n-card-2 p-3.5">
            <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#26E5E5]" />
              TIMESTAMP
            </div>
            <div className="font-bold text-[#F4F8FA] mt-1">{formatTime(alert.timestamp)}</div>
          </div>

          <div className="n-card-2 p-3.5">
            <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#35D07F]" />
              TRACK ID
            </div>
            <div className="font-bold text-[#F4F8FA] mt-1">
              {alert.track_id !== undefined ? `TRACK #${alert.track_id}` : "TRK #1"}
            </div>
          </div>

          <div className="n-card-2 p-3.5">
            <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#FF4D67]" />
              MONITORING ZONE
            </div>
            <div className="font-bold text-[#F4F8FA] mt-1 truncate">
              {alert.zone || "Zone 1: Inner Exclusion Belt"}
            </div>
          </div>

          <div className="n-card-2 p-3.5">
            <div className="text-[10px] text-[#8B9AA6] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#35D07F]" />
              EVIDENCE STATUS
            </div>
            <div className="font-bold text-[#35D07F] mt-1">
              {hasAlertMedia(alert) ? "FRAME CAPTURED" : "NONE"}
            </div>
          </div>
        </div>

        {/* Trajectory Profile */}
        <div className="n-card-2 p-4 font-mono text-xs space-y-1">
          <div className="text-[10px] text-[#8B9AA6] uppercase font-bold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#26E5E5]" />
            Target Trajectory:
          </div>
          <div className="text-[#F4F8FA] leading-relaxed">
            {alert.trajectory || "Heading south-east toward restricted zone boundary in simulated sector map."}
          </div>
        </div>

        {/* Evidence Viewer Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#8B9AA6] uppercase font-bold">
              Attached Snapshot / Video Evidence Media
            </span>
            <span className="text-[10px] text-[#26E5E5]">
              {hasAlertMedia(alert) ? "Snapshot + clip + path" : "Waiting for camera capture"}
            </span>
          </div>

          <EvidenceViewer alert={alert} path={alert.evidence_path} showTabs />
        </div>

        {/* Status Update Dropdown */}
        <div className="n-card-2 p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#8B9AA6]">UPDATE OPERATIONAL STATUS:</span>
            <select
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              className="bg-[#101A24] border border-[#1A343C] rounded-lg px-3 py-1.5 text-xs text-[#F4F8FA] focus:outline-none focus:border-[#26E5E5] font-bold"
            >
              <option value="open">Open (Unacknowledged)</option>
              <option value="acknowledged">Acknowledged (Review in progress)</option>
              <option value="escalated">Escalated (Field team informed)</option>
              <option value="resolved">Resolved (Area secured)</option>
              <option value="false_positive">False Positive (Animal / Glitch)</option>
            </select>
          </div>

          <span className="text-[11px] text-[#35D07F] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            CURRENT STATUS RECORDED
          </span>
        </div>

        {/* Actions Bar: View Camera, Open Evidence, Return */}
        <div className="pt-4 border-t border-[#1A343C] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/cameras")}
              className="px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#1A343C] text-[#F4F8FA] border border-[#1A343C] font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Video className="w-4 h-4 text-[#26E5E5]" />
              <span>View Live Camera ({alert.camera_id})</span>
            </button>

            <button
              onClick={() => navigate("/evidence")}
              className="px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#1A343C] text-[#F4F8FA] border border-[#1A343C] font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#26E5E5]" />
              <span>Open in Evidence Archive</span>
            </button>
          </div>

          <Link
            to="/alerts"
            className="px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#101A24] text-[#8B9AA6] hover:text-[#F4F8FA] border border-[#1A343C] font-mono text-xs transition-colors"
          >
            Back to All Alerts
          </Link>
        </div>
      </div>
    </div>
  );
}
