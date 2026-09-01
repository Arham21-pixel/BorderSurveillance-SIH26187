import { useEffect, useState } from "react";
import { fetchSummary } from "../services/api";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import { useWebSocket } from "../hooks/useWebSocket";
import AlertPanel from "../components/AlertPanel";
import CameraFeed from "../components/CameraFeed";
import CameraMap from "../components/CameraMap";

export default function Dashboard() {
  const alerts = useAlerts();
  const cameras = useCameras();
  const { lastMessage } = useWebSocket();
  const [summary, setSummary] = useState({ cameras_online: 0, cameras_total: 0, alerts_open: 0, alerts_by_severity: { high: 0, medium: 0, low: 0 } });

  useEffect(() => {
    fetchSummary().then(setSummary).catch(() => undefined);
  }, [lastMessage]);

  return (
    <section>
      <h1>Command dashboard</h1>
      <p className="sub">Live cameras, risk queue, and sector map. Alerts stay open until an operator acknowledges them.</p>
      <div className="grid stats">
        <div className="card"><div className="stat-value">{summary.cameras_online}/{summary.cameras_total}</div><div className="stat-label">Cameras online</div></div>
        <div className="card"><div className="stat-value">{summary.alerts_open}</div><div className="stat-label">Open alerts</div></div>
        <div className="card"><div className="stat-value">{summary.alerts_by_severity.high}</div><div className="stat-label">High risk</div></div>
        <div className="card"><div className="stat-value">{summary.alerts_by_severity.medium}</div><div className="stat-label">Medium risk</div></div>
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card"><CameraFeed /></div>
        <div className="card">
          <div className="stat-label">Alert queue</div>
          <div style={{ marginTop: 12 }}><AlertPanel alerts={alerts.slice(0, 4)} /></div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-label">Sector map</div>
        <CameraMap cameras={cameras} />
      </div>
    </section>
  );
}
