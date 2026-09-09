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
import PageHeader from "../components/ui/PageHeader";
import KpiCard from "../components/ui/KpiCard";
import Panel from "../components/ui/Panel";
import SectionHeader from "../components/ui/SectionHeader";
import LiveBadge from "../components/ui/LiveBadge";
import type { Alert } from "../types/alert";
import type { Camera } from "../types/camera";
import { formatTime } from "../utils/formatters";
import { CHART_TOOLTIP, COLORS, SECTOR_SHORT_LABEL } from "../lib/constants";
import {
  ShieldAlert,
  Video,
  MapPin,
  Activity,
  ChevronRight,
  Radio,
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

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [alertFilter, setAlertFilter] = useState<"all" | "high" | "open">("open");

  const trendData = useMemo(() => {
    const now = new Date();
    const buckets: { [key: string]: { time: string; alerts: number } } = {};

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = d.getHours().toString().padStart(2, "0") + ":00";
      buckets[hourStr] = { time: hourStr, alerts: 0 };
    }

    alerts.forEach((a) => {
      const alertTime = new Date(a.timestamp);
      const diffHours = (now.getTime() - alertTime.getTime()) / (1000 * 60 * 60);
      if (diffHours <= 8 && diffHours >= 0) {
        const hourStr = alertTime.getHours().toString().padStart(2, "0") + ":00";
        if (buckets[hourStr]) buckets[hourStr].alerts += 1;
      }
    });

    return Object.values(buckets);
  }, [alerts]);

  useEffect(() => {
    if (rawAlerts) {
      setAlerts(rawAlerts);
      setSelectedAlert(rawAlerts.length > 0 ? rawAlerts[0] : null);
    }
  }, [rawAlerts]);

  useEffect(() => {
    if (cameras && cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras, selectedCamera]);

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

  const openAlerts = alerts.filter((a) => a.status === "open");
  const criticalOpenCount = openAlerts.filter((a) => normalizeSeverity(a.severity) === "CRITICAL").length;
  const highOpenCount = openAlerts.filter((a) => normalizeSeverity(a.severity) === "HIGH").length;

  const onlineCamsCount = cameras.filter((c) => c.status === "online").length;
  const camerasOnlineLabel = cameras.length > 0 ? `${onlineCamsCount} / ${cameras.length}` : "1 / 3";

  const avgRiskScore = useMemo(() => {
    const open = alerts.filter((a) => a.status === "open");
    if (open.length === 0) return 18;
    const sum = open.reduce((acc, curr) => acc + (curr.risk_score || 0), 0);
    const avg = sum / open.length;
    return avg <= 1 ? Math.round(avg * 100) : Math.round(avg);
  }, [alerts]);

  const riskBand =
    avgRiskScore >= 80 ? "CRITICAL" : avgRiskScore >= 60 ? "HIGH" : avgRiskScore >= 30 ? "SUSPICIOUS" : "NORMAL";
  const riskTone =
    riskBand === "CRITICAL"
      ? "text-netra-critical"
      : riskBand === "HIGH"
      ? "text-netra-high"
      : riskBand === "SUSPICIOUS"
      ? "text-netra-suspicious"
      : "text-netra-normal";

  const selectedRisk = selectedAlert
    ? selectedAlert.risk_score != null && selectedAlert.risk_score <= 1
      ? Math.round(selectedAlert.risk_score * 100)
      : Math.round(selectedAlert.risk_score ?? avgRiskScore)
    : avgRiskScore;

  const contributingFactors = useMemo(() => {
    if (selectedAlert?.risk_breakdown?.length) {
      return selectedAlert.risk_breakdown.map((item) => ({
        label: item.signal,
        delta: item.delta,
      }));
    }
    if (selectedAlert?.reason) {
      return selectedAlert.reason
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((label) => ({ label, delta: 0 }));
    }
    return [];
  }, [selectedAlert]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="NETRA Command Dashboard"
        subtitle="What is happening right now across live video, detections and alerts."
        badge={
          <>
            <LiveBadge label="LIVE MONITORING" />
          </>
        }
        actions={
          <Link to="/alerts" className="n-btn-secondary">
            <ShieldAlert className="w-4 h-4 text-netra-accent" />
            Alerts ({openAlerts.length})
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard
          label="Active Alerts"
          value={openAlerts.length}
          hint="Open queue"
          icon={<ShieldAlert className="w-4 h-4" />}
        />
        <KpiCard
          label="Critical"
          value={criticalOpenCount}
          tone="critical"
          hint="Needs review"
        />
        <KpiCard
          label="High"
          value={highOpenCount}
          tone="high"
          hint="Elevated risk"
        />
        <KpiCard
          label="Cameras Online"
          value={camerasOnlineLabel}
          tone="normal"
          hint="Fleet online"
          icon={<Video className="w-4 h-4" />}
        />
        <KpiCard
          label="Average Risk"
          value={`${avgRiskScore}`}
          hint={<span className={riskTone}>{riskBand}</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <Panel>
            <SectionHeader
              icon={<Video className="w-4 h-4 text-netra-accent" />}
              title="Live Camera"
              action={
                <span className="text-[10px] font-semibold uppercase tracking-wider text-netra-normal flex items-center gap-1.5">
                  <Radio className="w-3 h-3" />
                  Selected feed
                </span>
              }
            />
            <CameraFeed
              title={selectedCamera?.name ?? "Gate Cam 01"}
              camera={selectedCamera ?? undefined}
              cameras={cameras}
              onSelectCamera={(cam) => setSelectedCamera(cam)}
              embedded
            />
          </Panel>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <Panel className="flex flex-col">
            <SectionHeader
              icon={<ShieldAlert className="w-4 h-4 text-netra-high" />}
              title="Active Alerts"
              action={
                <div className="flex items-center gap-1 bg-netra-card2 p-0.5 rounded-lg border border-netra-line text-[11px]">
                  {(["open", "high", "all"] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => setAlertFilter(key)}
                      className={`px-2 py-1 rounded-md capitalize ${
                        alertFilter === key
                          ? "bg-netra-accent/15 text-netra-accent"
                          : "text-netra-muted hover:text-netra-text"
                      }`}
                    >
                      {key === "high" ? "High" : key}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="max-h-[280px] overflow-y-auto pr-1">
              <AlertPanel
                alerts={filteredAlerts.slice(0, 6)}
                onAcknowledge={handleAcknowledge}
                onSelect={(alert) => {
                  setSelectedAlert(alert);
                  const matchingCam = cameras.find((c) => c.id === alert.camera_id);
                  if (matchingCam) setSelectedCamera(matchingCam);
                }}
                selectedAlertId={selectedAlert?.id}
              />
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Risk Overview" />
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="n-label mb-1">Score</div>
                <div className={`text-[40px] font-bold tracking-tight leading-none ${riskTone}`}>
                  {selectedRisk}
                </div>
                <div className="text-[11px] text-netra-muted mt-1">0–100 contextual risk</div>
              </div>
              {selectedAlert && <RiskBadge severity={selectedAlert.severity} size="md" />}
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-netra-accent n-gauge"
                style={{ width: `${Math.min(100, selectedRisk)}%` }}
              />
            </div>
            <div className="mt-4 space-y-1.5">
              {contributingFactors.length === 0 ? (
                <p className="text-[11px] text-netra-muted">
                  Contributing factors appear when an alert is selected.
                </p>
              ) : (
                contributingFactors.map((factor) => (
                  <div key={factor.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-netra-muted truncate pr-3">{factor.label}</span>
                    {factor.delta !== 0 && (
                      <span className={factor.delta > 0 ? "text-netra-high font-mono" : "text-netra-normal font-mono"}>
                        {factor.delta > 0 ? `+${factor.delta}` : factor.delta}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <SectionHeader
            icon={<Video className="w-4 h-4 text-netra-accent" />}
            title="Camera Status"
            action={
              <Link to="/cameras" className="text-xs text-netra-accent hover:text-netra-normal flex items-center gap-1">
                Live Cameras <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="space-y-2">
            {(cameras.length ? cameras : []).map((cam) => {
              const online = cam.status === "online";
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedCamera(cam)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-netra-card2 border border-netra-line text-left hover:border-netra-accent/30 transition-colors"
                >
                  <div>
                    <div className="text-[13px] font-medium text-netra-text">{cam.name}</div>
                    <div className="text-[10px] font-mono text-netra-muted mt-0.5">{cam.id}</div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      online
                        ? "text-netra-normal border-netra-normal/25 bg-netra-normal/10"
                        : "text-netra-muted border-netra-line"
                    }`}
                  >
                    {online ? "Online" : cam.status}
                  </span>
                </button>
              );
            })}
            {cameras.length === 0 && (
              <p className="text-xs text-netra-muted">Cameras appear here when the fleet is online.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={<Activity className="w-4 h-4 text-netra-accent" />}
            title="Recent Events"
          />
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="text-xs text-netra-muted">No behavioural events recorded yet.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="p-3 rounded-xl bg-netra-card2 border border-netra-line flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] text-netra-text truncate">{event.description || event.kind}</div>
                    <div className="text-[10px] font-mono text-netra-muted mt-0.5">
                      {event.camera_id} · {event.kind} · {formatTime(event.timestamp)}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-netra-high shrink-0">
                    {Math.round((event.risk_score ?? 0) <= 1 ? (event.risk_score ?? 0) * 100 : event.risk_score ?? 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={<MapPin className="w-4 h-4 text-netra-accent" />}
            title="Sector Map"
            action={
              <Link to="/map" className="text-xs text-netra-accent hover:text-netra-normal flex items-center gap-1">
                Expand <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="h-[260px] rounded-xl overflow-hidden border border-netra-accent/15">
            <CameraMap
              cameras={cameras}
              alerts={alerts.filter((a) => a.status === "open")}
              activeCameraId={selectedCamera?.id}
              onSelectCamera={(cam) => setSelectedCamera(cam)}
              height="100%"
            />
          </div>
          <p className="text-[10px] font-mono text-netra-muted2 mt-3">
            {SECTOR_SHORT_LABEL} · FENCE + RESTRICTED ZONE
          </p>
        </Panel>

        <Panel>
          <SectionHeader title="Alert Trend" />
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashAlertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,229,229,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke={COLORS.muted2} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.muted2} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Area type="monotone" dataKey="alerts" stroke={COLORS.accent} strokeWidth={2.5} fill="url(#dashAlertGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
