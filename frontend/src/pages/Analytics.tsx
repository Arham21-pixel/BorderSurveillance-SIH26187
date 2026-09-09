import { useMemo } from "react";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import { useDemoSessionOptional } from "../contexts/DemoSessionContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Activity, AlertTriangle, Camera, Layers, Moon, PawPrint, TrendingUp } from "lucide-react";
import { normalizeSeverity } from "../components/RiskBadge";
import PageHeader from "../components/ui/PageHeader";
import KpiCard from "../components/ui/KpiCard";
import LiveBadge from "../components/ui/LiveBadge";
import { EVENT_TYPE_LABELS } from "../lib/demoScenarios";
import { CHART_TOOLTIP, COLORS } from "../lib/constants";

type TrendPoint = { time: string; alerts: number; risk: number };

const DEMO_TIMELINE: TrendPoint[] = [
  { time: "14:00", alerts: 2, risk: 22 },
  { time: "15:00", alerts: 1, risk: 18 },
  { time: "16:00", alerts: 3, risk: 34 },
  { time: "17:00", alerts: 5, risk: 52 },
  { time: "18:00", alerts: 2, risk: 28 },
  { time: "19:00", alerts: 4, risk: 41 },
  { time: "20:00", alerts: 3, risk: 37 },
  { time: "21:00", alerts: 4, risk: 48 },
];

const DEMO_CAMERA_ACTIVITY = [
  { camera: "DEMO-01", alerts: 11 },
  { camera: "DEMO-02", alerts: 7 },
  { camera: "DEMO-03", alerts: 6 },
];

const DEMO_EVENT_TYPES = [
  { type: "Restricted zone", count: 8 },
  { type: "Loitering", count: 6 },
  { type: "Night / low-light", count: 5 },
  { type: "Group walking", count: 3 },
  { type: "Animal", count: 3 },
];

export default function Analytics() {
  const alerts = useAlerts();
  const cameras = useCameras();
  const session = useDemoSessionOptional();
  const usingDemoData = !session && alerts.length === 0;

  const severityCounts = useMemo(() => {
    if (usingDemoData) return { critical: 2, high: 6, suspicious: 10, normal: 6 };
    const counts = { critical: 0, high: 0, suspicious: 0, normal: 0 };
    alerts.forEach((alert) => {
      const sev = normalizeSeverity(alert.severity);
      if (sev === "CRITICAL") counts.critical += 1;
      else if (sev === "HIGH") counts.high += 1;
      else if (sev === "SUSPICIOUS") counts.suspicious += 1;
      else counts.normal += 1;
    });
    return counts;
  }, [alerts, usingDemoData]);

  const totalAlerts = usingDemoData
    ? 24
    : severityCounts.critical + severityCounts.high + severityCounts.suspicious + severityCounts.normal;

  const avgRiskScore = useMemo(() => {
    if (usingDemoData) return 48;
    if (alerts.length === 0) return 0;
    const avg = alerts.reduce((sum, alert) => sum + (alert.risk_score ?? 0), 0) / alerts.length;
    return avg <= 1 ? Math.round(avg * 100) : Math.round(avg);
  }, [alerts, usingDemoData]);

  const severityData = [
    { name: "Critical", value: severityCounts.critical, color: COLORS.critical },
    { name: "High", value: severityCounts.high, color: COLORS.high },
    { name: "Suspicious", value: severityCounts.suspicious, color: COLORS.suspicious },
    { name: "Normal", value: severityCounts.normal, color: COLORS.normal },
  ];

  const timelineData = useMemo<TrendPoint[]>(() => {
    if (usingDemoData) return DEMO_TIMELINE;
    const now = new Date();
    const map: Record<string, { alerts: number; riskSum: number }> = {};
    for (let i = 7; i >= 0; i--) {
      const slot = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${slot.getHours().toString().padStart(2, "0")}:00`;
      map[key] = { alerts: 0, riskSum: 0 };
    }
    alerts.forEach((alert) => {
      const stamp = new Date(alert.timestamp);
      const diffHours = (now.getTime() - stamp.getTime()) / (1000 * 60 * 60);
      if (diffHours < 0 || diffHours > 8) return;
      const key = `${stamp.getHours().toString().padStart(2, "0")}:00`;
      if (!map[key]) return;
      map[key].alerts += 1;
      const score = alert.risk_score ?? 0;
      map[key].riskSum += score <= 1 ? score * 100 : score;
    });
    return Object.entries(map).map(([time, v]) => ({
      time,
      alerts: v.alerts,
      risk: v.alerts ? Math.round(v.riskSum / v.alerts) : 0,
    }));
  }, [alerts, usingDemoData]);

  const cameraActivity = useMemo(() => {
    if (usingDemoData) return DEMO_CAMERA_ACTIVITY;
    const counts: Record<string, number> = {};
    alerts.forEach((alert) => {
      counts[alert.camera_id] = (counts[alert.camera_id] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([camera, count]) => ({ camera, alerts: count }))
      .sort((a, b) => b.alerts - a.alerts)
      .slice(0, 5);
  }, [alerts, usingDemoData]);

  const eventTypes = useMemo(() => {
    if (usingDemoData) return DEMO_EVENT_TYPES;
    const counts: Record<string, number> = {};
    alerts.forEach((alert) => {
      const raw = alert.event_type || alert.title || "event";
      const key = EVENT_TYPE_LABELS[raw] ?? raw.replace(/_/g, " ");
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [alerts, usingDemoData]);

  const animalCount = usingDemoData
    ? 3
    : alerts.filter((a) => (a.event_type ?? "").includes("animal") || a.object_class === "animal").length;
  const nightCount = usingDemoData
    ? 6
    : alerts.filter((a) => a.night || a.event_type === "night_activity").length;

  const lightingData = usingDemoData
    ? [
        { name: "Night / low-light", value: 6, color: COLORS.high },
        { name: "Day", value: 18, color: COLORS.accent },
      ]
    : [
        { name: "Night / low-light", value: nightCount, color: COLORS.high },
        { name: "Day", value: Math.max(0, totalAlerts - nightCount), color: COLORS.accent },
      ];

  const objectData = usingDemoData
    ? [
        { name: "Person", value: 21, color: COLORS.accent },
        { name: "Animal", value: 3, color: COLORS.suspicious },
      ]
    : [
        { name: "Animal", value: animalCount, color: COLORS.suspicious },
        { name: "Person / other", value: Math.max(0, totalAlerts - animalCount), color: COLORS.accent },
      ];

  const activeCameras = cameras.length
    ? `${cameras.filter((c) => c.status === "online").length} / ${cameras.length}`
    : "1 / 3";

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Analytics & Event Insights"
        subtitle="Alerts, cameras, night/low-light context, animal movement and risk mix from the feeds."
        badge={
          <LiveBadge
            label={session ? "FROM CAMERA FEEDS" : usingDemoData ? "SAMPLE BASELINE" : "LIVE EVENT DATA"}
            tone={usingDemoData ? "demo" : "live"}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <KpiCard label="Total Alerts" value={totalAlerts} icon={<Activity className="w-4 h-4" />} />
        <KpiCard label="Critical" value={severityCounts.critical} tone="critical" icon={<AlertTriangle className="w-4 h-4 text-netra-critical" />} />
        <KpiCard label="High" value={severityCounts.high} tone="high" icon={<AlertTriangle className="w-4 h-4 text-netra-high" />} />
        <KpiCard label="Average Risk" value={avgRiskScore} />
        <KpiCard label="Active Cameras" value={activeCameras} tone="accent" icon={<Camera className="w-4 h-4" />} />
        <KpiCard label="Night / low-light" value={nightCount} tone="high" icon={<Moon className="w-4 h-4" />} />
        <KpiCard label="Animal movement" value={animalCount} icon={<PawPrint className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-netra-accent" />
            Alerts Over Time
          </h2>
          <p className="text-xs text-netra-muted mb-4">Hourly alert counts from video events.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,229,229,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke={COLORS.muted2} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.muted2} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Area type="monotone" dataKey="alerts" stroke={COLORS.accent} strokeWidth={2.5} fill="url(#alertsGrad)" name="Alerts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-netra-accent" />
            Alerts by Severity
          </h2>
          <p className="text-xs text-netra-muted mb-2">Critical, high, suspicious, and normal mix.</p>
          <div className="relative h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value">
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke={COLORS.card} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-netra-text">{totalAlerts}</span>
              <span className="text-[10px] text-netra-muted uppercase tracking-wider">Total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text mb-4">Alerts by Camera</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraActivity} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} horizontal={false} />
                <XAxis type="number" stroke={COLORS.muted2} fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="camera" stroke={COLORS.muted2} fontSize={11} tickLine={false} width={78} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="alerts" fill={COLORS.accent} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text mb-4">Event Types</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventTypes} margin={{ top: 5, right: 8, left: -16, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,229,229,0.08)" vertical={false} />
                <XAxis dataKey="type" stroke={COLORS.muted2} fontSize={10} tickLine={false} interval={0} angle={-18} textAnchor="end" />
                <YAxis stroke={COLORS.muted2} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text mb-4">Risk Trend</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.high} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.high} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,229,229,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke={COLORS.muted2} fontSize={11} tickLine={false} />
                <YAxis stroke={COLORS.muted2} fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Area type="monotone" dataKey="risk" stroke={COLORS.high} strokeWidth={2} fill="url(#riskGrad)" name="Avg risk" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text flex items-center gap-2 mb-1">
            <Moon className="w-4 h-4 text-netra-high" />
            Lighting mix
          </h2>
          <p className="text-xs text-netra-muted mb-4">
            Night count is from frame luminance on the video, not a thermal camera.
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lightingData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,229,229,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke={COLORS.muted2} fontSize={11} tickLine={false} />
                <YAxis stroke={COLORS.muted2} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {lightingData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="n-card p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-netra-text flex items-center gap-2 mb-1">
            <PawPrint className="w-4 h-4 text-netra-accent" />
            Object class mix
          </h2>
          <p className="text-xs text-netra-muted mb-4">
            Animal movement uses on-device COCO classes (dog, cattle, bird, and similar).
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={objectData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,229,229,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke={COLORS.muted2} fontSize={11} tickLine={false} />
                <YAxis stroke={COLORS.muted2} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {objectData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
