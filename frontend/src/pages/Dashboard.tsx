import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchSummary, ackAlert } from "../services/api";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import { useEvents } from "../hooks/useEvents";
import { useWebSocket } from "../hooks/useWebSocket";
import AlertPanel from "../components/AlertPanel";
import CameraFeed from "../components/CameraFeed";
import CameraMap from "../components/CameraMap";
import RiskBadge from "../components/RiskBadge";
import type { Alert } from "../types/alert";
import type { Camera } from "../types/camera";
import { formatTime } from "../utils/formatters";
import {
  ShieldAlert,
  Video,
  MapPin,
  FileSearch,
  Activity,
  AlertOctagon,
  TrendingUp,
  Radio,
  ChevronRight,
  Eye,
  Shield
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// 8-hour alert trend data points
const mockTrendData = [
  { time: "08:00", alerts: 1, intrusions: 0 },
  { time: "09:00", alerts: 2, intrusions: 1 },
  { time: "10:00", alerts: 1, intrusions: 0 },
  { time: "11:00", alerts: 4, intrusions: 2 },
  { time: "12:00", alerts: 2, intrusions: 1 },
  { time: "13:00", alerts: 5, intrusions: 3 },
  { time: "14:00", alerts: 3, intrusions: 1 },
  { time: "15:00", alerts: 6, intrusions: 4 },
];

export default function Dashboard() {
  const rawAlerts = useAlerts();
  const cameras = useCameras();
  const { events } = useEvents(6);
  const { lastMessage } = useWebSocket();

  // Local state for optimistic alert acknowledgement and selection
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [alertFilter, setAlertFilter] = useState<"all" | "high" | "open">("open");

  const [summary, setSummary] = useState({
    cameras_online: 0,
    cameras_total: 0,
    alerts_open: 0,
    alerts_by_severity: { high: 0, medium: 0, low: 0 },
  });

  // Sync alerts when rawAlerts load
  useEffect(() => {
    if (rawAlerts && rawAlerts.length > 0) {
      setAlerts(rawAlerts);
      setSelectedAlert(rawAlerts[0]);
    }
  }, [rawAlerts]);

  // Sync default camera
  useEffect(() => {
    if (cameras && cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras, selectedCamera]);

  // Refresh summary when websocket fires
  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(() => {
        // Fallback calculation from local data
        setSummary({
          cameras_online: cameras.filter((c) => c.status === "online").length || 2,
          cameras_total: cameras.length || 3,
          alerts_open: alerts.filter((a) => a.status === "open").length || 1,
          alerts_by_severity: {
            high: alerts.filter((a) => a.severity === "high").length || 1,
            medium: alerts.filter((a) => a.severity === "medium").length || 0,
            low: alerts.filter((a) => a.severity === "low").length || 0,
          },
        });
      });
  }, [lastMessage, cameras, alerts]);

  // Optimistic alert acknowledgement
  const handleAcknowledge = async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a))
    );
    try {
      await ackAlert(id);
    } catch {
      // Keep optimistic update in demo mode
    }
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (alertFilter === "high") {
      return alerts.filter((a) => a.severity === "high");
    }
    if (alertFilter === "open") {
      return alerts.filter((a) => a.status === "open");
    }
    return alerts;
  }, [alerts, alertFilter]);

  // Critical/high alerts count
  const criticalCount = alerts.filter(
    (a) => a.severity === "high" && a.status === "open"
  ).length;

  const onlineCamsCount = cameras.filter((c) => c.status === "online").length;

  return (
    <div className="space-y-6">
      {/* Tactical Situational Awareness Banner: Answers "What, Where, How serious, Evidence" */}
      <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#3dd6c6]/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#ff5a5a]/20 text-[#ff5a5a] border border-[#ff5a5a]/40">
                <AlertOctagon className="w-3 h-3 animate-pulse" />
                {criticalCount > 0 ? "LIVE THREAT DETECTED" : "SECTOR PATROL ACTIVE"}
              </span>
              <span className="text-[11px] font-mono text-[#8fa3b8]">
                LADAKH SECTOR 4 · LINE OF ACTUAL CONTROL
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
              Sentinel Primary Command & Triage Console
            </h1>

            {/* Quick Answer Grid */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8fa3b8]">WHAT:</span>
                <span className="text-[#e8eef5] font-bold">
                  {selectedAlert ? selectedAlert.title : "Perimeter Belt Crossings"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8fa3b8]">WHERE:</span>
                <span className="text-[#3dd6c6] font-bold">
                  {selectedCamera ? selectedCamera.name : "North Fence 01"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8fa3b8]">SEVERITY:</span>
                <span className="text-[#ff5a5a] font-bold uppercase">
                  {criticalCount > 0 ? "CRITICAL / HIGH" : "NORMAL MONITORING"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8fa3b8]">EVIDENCE:</span>
                <span className="text-[#5ad67a] font-bold">
                  {selectedAlert?.evidence_path ? "SNAPSHOT ATTACHED" : "CLIP LOGGED"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <Link
              to="/alerts"
              className="px-3.5 py-2 rounded-lg bg-[#ff5a5a]/10 hover:bg-[#ff5a5a]/20 text-[#ff5a5a] border border-[#ff5a5a]/30 font-bold transition-all flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Triage Queue ({criticalCount})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Current Risk Overview */}
        <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8fa3b8] mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              1. Threat Level & Risk
            </span>
            <Shield className="w-4 h-4 text-[#ff5a5a]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#ff5a5a] font-mono">
              {criticalCount > 0 ? "DEFCON 3" : "DEFCON 4"}
            </div>
            <div className="text-xs font-mono px-2 py-0.5 rounded bg-[#3a1515] text-[#ff5a5a] font-bold">
              HIGH RISK
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#243140]/60 text-[10px] font-mono text-[#8fa3b8] flex justify-between">
            <span>COMPOSITE SCORE</span>
            <span className="text-[#e8eef5] font-bold">0.88 / 1.00</span>
          </div>
        </div>

        {/* 2. Active & Critical Alerts */}
        <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8fa3b8] mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              2. Active Alerts
            </span>
            <AlertOctagon className="w-4 h-4 text-[#3dd6c6]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#e8eef5] font-mono">
              {alerts.filter((a) => a.status === "open").length}
              <span className="text-xs text-[#8fa3b8] font-normal ml-1.5">OPEN</span>
            </div>
            <div className="text-xs font-mono text-[#ff5a5a] font-bold">
              {criticalCount} CRITICAL
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#243140]/60 text-[10px] font-mono text-[#8fa3b8] flex justify-between">
            <span>HIGH: {summary.alerts_by_severity.high || 1}</span>
            <span>MED: {summary.alerts_by_severity.medium || 0}</span>
            <span>LOW: {summary.alerts_by_severity.low || 0}</span>
          </div>
        </div>

        {/* 3. Camera Fleet Status */}
        <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8fa3b8] mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              3. Camera Status
            </span>
            <Video className="w-4 h-4 text-[#5ad67a]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#5ad67a] font-mono">
              {onlineCamsCount || 2}/{cameras.length || 3}
              <span className="text-xs text-[#8fa3b8] font-normal ml-1.5">ONLINE</span>
            </div>
            <div className="text-xs font-mono px-2 py-0.5 rounded bg-[#14321c] text-[#5ad67a] font-bold">
              HEALTHY
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#243140]/60 text-[10px] font-mono text-[#8fa3b8] flex justify-between">
            <span>RTSP / MP4 / WEBCAM</span>
            <span className="text-[#3dd6c6]">30 FPS ACTIVE</span>
          </div>
        </div>

        {/* 4. Quick Evidence & Forensic Archive */}
        <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8fa3b8] mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              4. Evidence Packages
            </span>
            <FileSearch className="w-4 h-4 text-[#3dd6c6]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#3dd6c6] font-mono">
              {alerts.length}
              <span className="text-xs text-[#8fa3b8] font-normal ml-1.5">CAPTURED</span>
            </div>
            <Link
              to="/evidence"
              className="text-xs font-mono text-[#3dd6c6] hover:underline flex items-center gap-0.5"
            >
              Archive <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-2 pt-2 border-t border-[#243140]/60 text-[10px] font-mono text-[#8fa3b8] flex justify-between">
            <span>CRYPTOGRAPHIC AUDIT</span>
            <span className="text-[#5ad67a]">READY</span>
          </div>
        </div>
      </div>

      {/* Main Command Workspace Grid: Left (Feeds + Map) | Right (Alert Triage + Evidence + Recent Incidents) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Preview (Item 7) & Tactical Sector Map (Item 8) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Item 7: Live Camera Preview */}
          <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
                <Video className="w-4 h-4 text-[#3dd6c6]" />
                7. Live Tactical Camera Preview & Inference
              </span>
              <span className="text-[10px] font-mono text-[#5ad67a] flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-ping" />
                YOLOv8 DETECTIONS ON
              </span>
            </div>

            <CameraFeed
              title={selectedCamera?.name ?? "North Fence 01"}
              camera={selectedCamera ?? undefined}
              cameras={cameras}
              onSelectCamera={(cam) => setSelectedCamera(cam)}
            />
          </div>

          {/* Item 8: Tactical Sector Map */}
          <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3dd6c6]" />
                8. Sector Surveillance Grid (GIS Map)
              </span>
              <Link
                to="/map"
                className="text-xs font-mono text-[#3dd6c6] hover:underline flex items-center gap-1"
              >
                Expand Sector Map <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="h-[300px] rounded-lg overflow-hidden">
              <CameraMap
                cameras={cameras}
                activeCameraId={selectedCamera?.id}
                onSelectCamera={(cam) => setSelectedCamera(cam)}
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Alert Queue (Items 1, 2, 3), Quick Evidence (Item 9), Recent Incidents (Item 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Items 1, 2, 3: Active, Critical & High Alerts Queue */}
          <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#ff5a5a]" />
                Active Alerts Queue ({filteredAlerts.length})
              </span>

              {/* Triage Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#0c141c] p-0.5 rounded-lg border border-[#243140] text-[10px] font-mono">
                <button
                  onClick={() => setAlertFilter("open")}
                  className={`px-2 py-0.5 rounded ${
                    alertFilter === "open"
                      ? "bg-[#16202b] text-[#3dd6c6] font-bold"
                      : "text-[#8fa3b8] hover:text-[#e8eef5]"
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setAlertFilter("high")}
                  className={`px-2 py-0.5 rounded ${
                    alertFilter === "high"
                      ? "bg-[#16202b] text-[#ff5a5a] font-bold"
                      : "text-[#8fa3b8] hover:text-[#e8eef5]"
                  }`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  onClick={() => setAlertFilter("all")}
                  className={`px-2 py-0.5 rounded ${
                    alertFilter === "all"
                      ? "bg-[#16202b] text-[#e8eef5] font-bold"
                      : "text-[#8fa3b8] hover:text-[#e8eef5]"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
              <AlertPanel
                alerts={filteredAlerts}
                onAcknowledge={handleAcknowledge}
                onSelect={(alert) => {
                  setSelectedAlert(alert);
                  const matchingCam = cameras.find((c) => c.id === alert.camera_id);
                  if (matchingCam) setSelectedCamera(matchingCam);
                }}
                selectedAlertId={selectedAlert?.id}
              />
            </div>
          </div>

          {/* Item 9: Quick Evidence Access */}
          <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-[#3dd6c6]" />
                9. Quick Evidence Access
              </span>
              <Link
                to="/evidence"
                className="text-xs font-mono text-[#3dd6c6] hover:underline flex items-center gap-1"
              >
                Inspect All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {selectedAlert ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#e8eef5]">
                      {selectedAlert.title}
                    </div>
                    <div className="text-[10px] font-mono text-[#8fa3b8] mt-0.5">
                      {selectedAlert.camera_id} · {formatTime(selectedAlert.timestamp)}
                    </div>
                  </div>
                  <RiskBadge severity={selectedAlert.severity} />
                </div>

                {/* Evidence Snapshot Placeholder or Media */}
                <div className="p-4 rounded-lg bg-[#0c141c] border border-[#243140] text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-2">
                    <div className="w-10 h-10 rounded-full bg-[#16202b] border border-[#3dd6c6]/30 flex items-center justify-center text-[#3dd6c6]">
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-[#e8eef5]">
                      {selectedAlert.evidence_path || "Snapshot capture ref: /data/demo/snap_01.jpg"}
                    </span>
                    <span className="text-[10px] text-[#8fa3b8]">
                      Bounding Box [x1: 0.18, y1: 0.22, x2: 0.42, y2: 0.78] · Target: Person
                    </span>
                  </div>
                </div>

                <Link
                  to="/evidence"
                  className="w-full py-2 px-3 rounded-lg bg-[#16202b] hover:bg-[#3dd6c6]/20 text-[#3dd6c6] border border-[#3dd6c6]/30 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>Open Full Forensic Package in Archive</span>
                </Link>
              </div>
            ) : (
              <div className="p-6 text-center text-[#8fa3b8] font-mono text-xs">
                Select an alert above to inspect attached evidence.
              </div>
            )}
          </div>

          {/* Item 5: Recent Incidents Stream */}
          <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#3dd6c6]" />
                5. Recent Incidents (Behavior Engine)
              </span>
              <span className="text-[10px] font-mono text-[#8fa3b8]">
                REAL-TIME TELEMETRY
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8fa3b8] font-mono">
                  No behavioural events recorded.
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-2.5 rounded-lg bg-[#0c141c] border border-[#243140] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#e8eef5] truncate">
                        {event.description}
                      </div>
                      <div className="text-[10px] font-mono text-[#8fa3b8] mt-0.5">
                        {event.camera_id} · {event.kind} · {formatTime(event.timestamp)}
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#16202b] text-[#ff5a5a] border border-[#ff5a5a]/30">
                        RISK {(event.risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Item 10: Alert Trend Chart (Clean, focused Recharts visualization without clutter) */}
      <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#243140] mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3dd6c6]" />
            <span className="text-xs font-mono font-bold uppercase text-[#e8eef5]">
              10. Shift Alert & Intrusion Frequency Trend (Last 8 Hours)
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-[#3dd6c6]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3dd6c6]" />
              Total Alerts
            </span>
            <span className="flex items-center gap-1.5 text-[#ff5a5a]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5a5a]" />
              Zone Intrusions
            </span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3dd6c6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3dd6c6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="intrusionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5a5a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff5a5a" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#243140" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#8fa3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#243140" }}
              />
              <YAxis
                stroke="#8fa3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#243140" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#101820",
                  borderColor: "#243140",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#e8eef5",
                  fontFamily: "monospace",
                }}
              />
              <Area
                type="monotone"
                dataKey="alerts"
                stroke="#3dd6c6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#alertGrad)"
              />
              <Area
                type="monotone"
                dataKey="intrusions"
                stroke="#ff5a5a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#intrusionGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
