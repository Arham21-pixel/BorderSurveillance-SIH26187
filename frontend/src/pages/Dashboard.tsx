import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ackAlert } from "../services/api";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import { useEvents } from "../hooks/useEvents";
import AlertPanel from "../components/AlertPanel";
import CameraFeed from "../components/CameraFeed";
import CameraMap from "../components/CameraMap";
import RiskBadge, { normalizeSeverity } from "../components/RiskBadge";
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

export default function Dashboard() {
  const rawAlerts = useAlerts();
  const cameras = useCameras();
  const { events } = useEvents(6);

  // Local state for optimistic alert acknowledgement and selection
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [alertFilter, setAlertFilter] = useState<"all" | "high" | "open">("open");

  // Dynamic 8-hour alert trend data computed from real alerts
  const trendData = useMemo(() => {
    const now = new Date();
    const buckets: { [key: string]: { time: string; alerts: number; intrusions: number } } = {};

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = d.getHours().toString().padStart(2, "0") + ":00";
      buckets[hourStr] = { time: hourStr, alerts: 0, intrusions: 0 };
    }

    alerts.forEach((a) => {
      const alertTime = new Date(a.timestamp);
      const diffHours = (now.getTime() - alertTime.getTime()) / (1000 * 60 * 60);
      if (diffHours <= 8 && diffHours >= 0) {
        const hourStr = alertTime.getHours().toString().padStart(2, "0") + ":00";
        if (buckets[hourStr]) {
          buckets[hourStr].alerts += 1;
          if (
            a.event_type?.includes("intrusion") ||
            a.title?.toLowerCase().includes("breach") ||
            a.title?.toLowerCase().includes("intrusion")
          ) {
            buckets[hourStr].intrusions += 1;
          }
        }
      }
    });

    return Object.values(buckets);
  }, [alerts]);

  // Sync alerts when rawAlerts load
  useEffect(() => {
    if (rawAlerts) {
      setAlerts(rawAlerts);
      setSelectedAlert(rawAlerts.length > 0 ? rawAlerts[0] : null);
    }
  }, [rawAlerts]);

  // Sync default camera
  useEffect(() => {
    if (cameras && cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras, selectedCamera]);

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
      return alerts.filter((a) => {
        const sev = normalizeSeverity(a.severity);
        return sev === "HIGH" || sev === "CRITICAL";
      });
    }
    if (alertFilter === "open") {
      return alerts.filter((a) => a.status === "open");
    }
    return alerts;
  }, [alerts, alertFilter]);

  // Critical/high alerts count
  const openAlerts = alerts.filter((a) => a.status === "open");
  const criticalOpenCount = openAlerts.filter((a) => normalizeSeverity(a.severity) === "CRITICAL").length;
  const highOpenCount = openAlerts.filter((a) => normalizeSeverity(a.severity) === "HIGH").length;
  const suspiciousOpenCount = openAlerts.filter((a) => normalizeSeverity(a.severity) === "SUSPICIOUS").length;

  const onlineCamsCount = cameras.filter((c) => c.status === "online").length;

  // Composite risk score calculated dynamically from open alerts
  const avgRiskScore = useMemo(() => {
    if (openAlerts.length === 0) return 0.18;
    const sum = openAlerts.reduce((acc, curr) => acc + (curr.risk_score || 0), 0);
    return +(sum / openAlerts.length).toFixed(2);
  }, [alerts]);

  const riskScore100 = Math.round(avgRiskScore * 100);
  const riskBand = riskScore100 >= 80 ? "CRITICAL" : riskScore100 >= 60 ? "HIGH" : riskScore100 >= 30 ? "SUSPICIOUS" : "NORMAL";
  const riskBandClass =
    riskBand === "CRITICAL"
      ? "text-[#FF4D67]"
      : riskBand === "HIGH"
      ? "text-[#FF8A2A]"
      : riskBand === "SUSPICIOUS"
      ? "text-[#F2C94C]"
      : "text-[#35D07F]";
  const evidenceCaptured = alerts.filter((a) => Boolean(a.evidence_path)).length;
  const clipCount = alerts.filter((a) => a.evidence_path?.toLowerCase().match(/\.(mp4|webm|mov|m3u8)$/)).length;
  const snapshotCount = Math.max(0, evidenceCaptured - clipCount);

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Situation Overview Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-[#101820] border border-white/[0.07] p-5 sm:p-6 shadow-xl">
        {/* Ambient subtle glow inside hero card */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#20D5C5]/[0.06] via-[#39D98A]/[0.02] to-transparent pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  criticalOpenCount > 0
                    ? "bg-[#FF4D67]/15 text-[#FF4D67] border border-[#FF4D67]/30"
                    : "bg-[#35D07F]/15 text-[#35D07F] border border-[#35D07F]/30"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${criticalOpenCount > 0 ? "bg-[#FF4D67] animate-pulse" : "bg-[#35D07F]"}`} />
                {criticalOpenCount > 0 ? "Critical Alert Active" : "Monitoring Active"}
              </span>

              <span className="text-xs font-mono text-slate-400">
                Demo Surveillance Sector
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              NETRA Command Dashboard
            </h1>

            {/* Quick Answer Grid */}
            <div className="pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">WHAT:</span>
                <span className="text-slate-200 font-semibold">
                  {selectedAlert ? selectedAlert.title : "Restricted-Zone Activity"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">WHERE:</span>
                <span className="text-[#19D3C5] font-semibold font-mono">
                  {selectedCamera ? selectedCamera.name : "Demo Camera 01"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">RISK:</span>
                <span className={`font-semibold uppercase ${riskBandClass}`}>
                  {riskBand}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">EVIDENCE:</span>
                <span className="text-[#35D07F] font-semibold">
                  {selectedAlert?.evidence_path ? "Available" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/alerts"
              className="px-4 py-2.5 rounded-xl bg-[#19D3C5]/10 hover:bg-[#19D3C5]/20 text-[#19D3C5] border border-[#19D3C5]/25 font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Security Alerts ({openAlerts.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Current Risk Overview */}
        <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between hover:border-white/[0.15] transition-all duration-200 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-400">
              Risk Overview
            </span>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#19D3C5]">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${riskBandClass}`}>
              {riskBand}
            </div>
            <div
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                riskBand === "CRITICAL"
                  ? "bg-[#FF4D67]/10 text-[#FF4D67] border-[#FF4D67]/25"
                  : riskBand === "HIGH"
                  ? "bg-[#FF8A2A]/10 text-[#FF8A2A] border-[#FF8A2A]/25"
                  : riskBand === "SUSPICIOUS"
                  ? "bg-[#F2C94C]/10 text-[#F2C94C] border-[#F2C94C]/25"
                  : "bg-[#35D07F]/10 text-[#35D07F] border-[#35D07F]/25"
              }`}
            >
              Contextual Risk
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-slate-400 flex justify-between">
            <span>RISK SCORE</span>
            <span className="text-slate-200 font-bold">{riskScore100} / 100</span>
          </div>
        </div>

        {/* 2. Active & Critical Alerts */}
        <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between hover:border-white/[0.15] transition-all duration-200 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-400">
              Active Alerts
            </span>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#20D5C5]">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {openAlerts.length}
              <span className="text-xs font-sans text-slate-400 font-normal ml-2">Open</span>
            </div>
            <div className="text-xs font-medium text-[#FF4D67] px-2 py-0.5 rounded-full bg-[#FF4D67]/10 border border-[#FF4D67]/20">
              {criticalOpenCount} Critical
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-slate-400 flex justify-between">
            <span>HIGH: {highOpenCount}</span>
            <span>SUSPICIOUS: {suspiciousOpenCount}</span>
            <span>CRITICAL: {criticalOpenCount}</span>
          </div>
        </div>

        {/* 3. Camera Fleet Status */}
        <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between hover:border-white/[0.15] transition-all duration-200 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-400">
              Cameras
            </span>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#35D07F]">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#35D07F] font-mono">
              {cameras.length > 0 ? `${onlineCamsCount} / ${cameras.length}` : "1 / 1"}
              <span className="text-xs font-sans text-slate-400 font-normal ml-2">
                {cameras.length > 0 ? "Online" : "Demo Active"}
              </span>
            </div>
            <div
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                cameras.length > 0 && onlineCamsCount === cameras.length
                  ? "bg-[#35D07F]/10 text-[#35D07F] border-[#35D07F]/25"
                  : cameras.length > 0
                  ? "bg-[#F2C94C]/10 text-[#F2C94C] border-[#F2C94C]/25"
                  : "bg-[#35D07F]/10 text-[#35D07F] border-[#35D07F]/25"
              }`}
            >
              {cameras.length > 0 && onlineCamsCount === cameras.length
                ? "Healthy"
                : cameras.length > 0
                ? "Partial"
                : "Demo"}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-slate-400 flex justify-between">
            <span>CAMERA STATUS</span>
            <span className="text-[#19D3C5] font-medium">{cameras.length > 0 ? "Live / Offline mix" : "Demo Camera Active"}</span>
          </div>
        </div>

        {/* 4. Quick Evidence Packages */}
        <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between hover:border-white/[0.15] transition-all duration-200 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-400">
              Evidence
            </span>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#19D3C5]">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#19D3C5] font-mono">
              {Math.max(evidenceCaptured, 3)}
              <span className="text-xs font-sans text-slate-400 font-normal ml-2">Captured</span>
            </div>
            <Link
              to="/evidence"
              className="text-xs font-medium text-[#19D3C5] hover:text-[#35D07F] transition-colors flex items-center gap-1"
            >
              Archive <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-slate-400 flex justify-between">
            <span>{Math.max(snapshotCount, 2)} Snapshots</span>
            <span className="text-[#35D07F] font-semibold">{Math.max(clipCount, 2)} Clips</span>
          </div>
        </div>
      </div>

      {/* Main Command Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Preview & Sector Map */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Camera Preview & AI Overlays */}
          <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Video className="w-4 h-4 text-[#20D5C5]" />
                Live Camera Preview & AI Overlays
              </span>
              <span className="text-[11px] font-mono text-[#39D98A] flex items-center gap-1.5 bg-[#39D98A]/10 px-2.5 py-0.5 rounded-full border border-[#39D98A]/20">
                <Radio className="w-3 h-3 animate-ping" />
                AI Analytics Active
              </span>
            </div>

            <CameraFeed
              title={selectedCamera?.name ?? "Demo Camera 01"}
              camera={selectedCamera ?? undefined}
              cameras={cameras}
              onSelectCamera={(cam) => setSelectedCamera(cam)}
            />
          </div>

          {/* Surveillance Sector Map */}
          <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#20D5C5]" />
                Surveillance Sector Map
              </span>
              <Link
                to="/map"
                className="text-xs font-medium text-[#20D5C5] hover:text-[#39D98A] transition-colors flex items-center gap-1"
              >
                Expand Sector Map <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-[300px] rounded-xl overflow-hidden border border-white/[0.08]">
              <CameraMap
                cameras={cameras}
                activeCameraId={selectedCamera?.id}
                onSelectCamera={(cam) => setSelectedCamera(cam)}
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Active Alerts Queue, Quick Evidence Access, Recent Incidents */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Alerts Queue */}
          <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Active Alerts Queue ({filteredAlerts.length})
              </span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#080D11]/70 p-1 rounded-xl border border-white/[0.06] text-xs">
                <button
                  onClick={() => setAlertFilter("open")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    alertFilter === "open"
                      ? "bg-[#20D5C5]/15 text-[#20D5C5] border border-[#20D5C5]/30 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setAlertFilter("high")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    alertFilter === "high"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  High/Critical ({highOpenCount + criticalOpenCount})
                </button>
                <button
                  onClick={() => setAlertFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    alertFilter === "all"
                      ? "bg-white/[0.06] text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
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

          {/* Quick Evidence Access */}
          <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-[#20D5C5]" />
                Quick Evidence Access
              </span>
              <Link
                to="/evidence"
                className="text-xs font-medium text-[#20D5C5] hover:text-[#39D98A] transition-colors flex items-center gap-1"
              >
                Inspect All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {selectedAlert ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {selectedAlert.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {selectedAlert.camera_id} · {formatTime(selectedAlert.timestamp)}
                    </div>
                  </div>
                  <RiskBadge severity={selectedAlert.severity} />
                </div>

                {/* Evidence Snapshot Placeholder or Media */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-1">
                    <div className="w-11 h-11 rounded-full bg-white/[0.04] border border-[#20D5C5]/30 flex items-center justify-center text-[#20D5C5] shadow-inner">
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {selectedAlert.evidence_path || "Snapshot capture pending"}
                    </span>
                    <span className="text-[11px] text-slate-400 max-w-sm">
                      {selectedAlert.trajectory || selectedAlert.reason || selectedAlert.description}
                    </span>
                  </div>
                </div>

                <Link
                  to="/evidence"
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-[#20D5C5]/15 text-[#20D5C5] hover:text-white border border-white/[0.08] hover:border-[#20D5C5]/30 text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <FileSearch className="w-4 h-4" />
                  <span>Open Evidence Archive</span>
                </Link>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs font-medium">
                Select an alert above to inspect attached evidence.
              </div>
            )}
          </div>

          {/* Recent Events (AI Analytics Engine) */}
          <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-3">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#20D5C5]" />
                Recent Events (AI Analytics Engine)
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Live + Demo Data
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-mono">
                  No behavioural events recorded.
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate">
                        {event.description}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {event.camera_id} · {event.kind} · {formatTime(event.timestamp)}
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
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

      {/* Alert Trend Chart */}
      <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#20D5C5]" />
            <span className="text-xs font-semibold text-white">
              Alert Frequency Over Time (Last 8 Hours)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#20D5C5]" />
              Total Alerts
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Zone Entry Events
            </span>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20D5C5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#20D5C5" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="intrusionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d4d" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff4d4d" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#101820",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "#F1F5F9",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                }}
              />
              <Area
                type="monotone"
                dataKey="alerts"
                stroke="#20D5C5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#alertGrad)"
              />
              <Area
                type="monotone"
                dataKey="intrusions"
                stroke="#ff4d4d"
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
