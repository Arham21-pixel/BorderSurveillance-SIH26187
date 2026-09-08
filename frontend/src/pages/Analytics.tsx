import { useMemo } from "react";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
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
import { Activity, AlertTriangle, Camera, Layers, TrendingUp } from "lucide-react";
import { normalizeSeverity } from "../components/RiskBadge";

type TrendPoint = {
  time: string;
  alerts: number;
};

const DEMO_TIMELINE: TrendPoint[] = [
  { time: "14:00", alerts: 2 },
  { time: "15:00", alerts: 1 },
  { time: "16:00", alerts: 3 },
  { time: "17:00", alerts: 5 },
  { time: "18:00", alerts: 2 },
  { time: "19:00", alerts: 4 },
  { time: "20:00", alerts: 3 },
  { time: "21:00", alerts: 4 },
];

const DEMO_CAMERA_ACTIVITY = [
  { camera: "DEMO-01", alerts: 11 },
  { camera: "DEMO-02", alerts: 7 },
  { camera: "DEMO-03", alerts: 6 },
];

export default function Analytics() {
  const alerts = useAlerts();
  useCameras(); // Keeps camera data warm for other pages in the session.

  const usingDemoData = alerts.length === 0;

  const severityCounts = useMemo(() => {
    if (usingDemoData) {
      return { critical: 2, high: 6, suspicious: 10, normal: 6 };
    }

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
    return Math.round(avg * 100);
  }, [alerts, usingDemoData]);

  const severityData = [
    { name: "Critical", value: severityCounts.critical, color: "#FF4D67" },
    { name: "High", value: severityCounts.high, color: "#FF8A2A" },
    { name: "Suspicious", value: severityCounts.suspicious, color: "#F2C94C" },
    { name: "Normal", value: severityCounts.normal, color: "#35D07F" },
  ];

  const timelineData = useMemo<TrendPoint[]>(() => {
    if (usingDemoData) return DEMO_TIMELINE;

    const now = new Date();
    const map: Record<string, TrendPoint> = {};
    for (let i = 7; i >= 0; i--) {
      const slot = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${slot.getHours().toString().padStart(2, "0")}:00`;
      map[key] = { time: key, alerts: 0 };
    }

    alerts.forEach((alert) => {
      const stamp = new Date(alert.timestamp);
      const diffHours = (now.getTime() - stamp.getTime()) / (1000 * 60 * 60);
      if (diffHours < 0 || diffHours > 8) return;
      const key = `${stamp.getHours().toString().padStart(2, "0")}:00`;
      if (map[key]) map[key].alerts += 1;
    });

    return Object.values(map);
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

  const topCamera = cameraActivity[0]?.camera ?? "DEMO-01";

  return (
    <div className="space-y-6 sm:space-y-7 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Analytics & Event Insights
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${
                usingDemoData
                  ? "bg-[#F2C94C]/15 text-[#F2C94C] border-[#F2C94C]/25"
                  : "bg-[#35D07F]/15 text-[#35D07F] border-[#35D07F]/25"
              }`}
            >
              {usingDemoData ? "SIMULATED / DEMO DATA" : "LIVE EVENT DATA"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Trends across alerts, cameras, event types and risk levels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0D171B] border border-white/[0.07] shadow-lg">
          <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
            <span>Total Alerts</span>
            <Activity className="w-4 h-4 text-[#19D3C5]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2 font-mono">{totalAlerts}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0D171B] border border-white/[0.07] shadow-lg">
          <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
            <span>Critical</span>
            <AlertTriangle className="w-4 h-4 text-[#FF4D67]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FF4D67] mt-2 font-mono">
            {severityCounts.critical}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0D171B] border border-white/[0.07] shadow-lg">
          <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
            <span>High</span>
            <AlertTriangle className="w-4 h-4 text-[#FF8A2A]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FF8A2A] mt-2 font-mono">
            {severityCounts.high}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0D171B] border border-white/[0.07] shadow-lg">
          <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
            <span>Avg Risk</span>
            <TrendingUp className="w-4 h-4 text-[#19D3C5]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2 font-mono">
            {avgRiskScore} / 100
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0D171B] border border-white/[0.07] col-span-2 lg:col-span-1 shadow-lg">
          <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
            <span>Top Camera</span>
            <Camera className="w-4 h-4 text-[#19D3C5]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#19D3C5] mt-2 font-mono">
            {topCamera}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0D171B] border border-white/[0.07] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#19D3C5]" />
                Alert Frequency Over Time
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hourly alert counts from video events and contextual risk scoring.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#19D3C5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#19D3C5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="#617079" fontSize={11} tickLine={false} />
                <YAxis stroke="#617079" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D171B",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#F4F7F7",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="alerts"
                  stroke="#19D3C5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#alertsGrad)"
                  name="Total Alerts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0D171B] border border-white/[0.07] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xl">
          <div className="pb-3.5 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#19D3C5]" />
              Alert Severity Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Critical, high, suspicious, and normal alert mix.
            </p>
          </div>

          <div className="relative h-48 flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`severity-${index}`} fill={entry.color} stroke="#0D171B" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D171B",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#F4F7F7",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-white">{totalAlerts}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Total Alerts
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0D171B] border border-white/[0.07] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#19D3C5]" />
              Alerts by Camera
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Camera-wise alert volume for the current dashboard data window.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          {cameraActivity.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No camera alert activity available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraActivity} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#617079" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="camera" stroke="#617079" fontSize={11} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D171B",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#F4F7F7",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} alerts`, "Total Alerts"]}
                />
                <Bar dataKey="alerts" fill="#19D3C5" radius={[0, 6, 6, 0]} name="Total Alerts" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
