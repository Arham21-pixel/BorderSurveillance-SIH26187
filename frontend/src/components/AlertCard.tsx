import RiskBadge from "./RiskBadge";
import type { Alert } from "../types/alert";
import { formatTime } from "../utils/formatters";

export default function AlertCard({ alert }: { alert: Alert }) {
  return (
    <article className="alert-card">
      <RiskBadge severity={alert.severity} />
      <h3>{alert.title}</h3>
      <p>{alert.description}</p>
      <p style={{ marginTop: 8 }}>{alert.camera_id} · {formatTime(alert.timestamp)}</p>
    </article>
  );
}
