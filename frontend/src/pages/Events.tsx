import { useEffect, useState } from "react";
import { fetchEvents } from "../services/api";
import type { EventItem } from "../types/event";
import RiskBadge from "../components/RiskBadge";
import { formatTime } from "../utils/formatters";

function severityFromScore(score: number): string {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => {
    fetchEvents().then(setEvents).catch(() => undefined);
  }, []);
  return (
    <section>
      <h1>Events</h1>
      <p className="sub">Behaviour detections scored by the risk engine.</p>
      <div className="card">
        <table>
          <thead><tr><th>Kind</th><th>Camera</th><th>Risk</th><th>Time</th></tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.kind}</td>
                <td>{event.camera_id}</td>
                <td><RiskBadge severity={severityFromScore(event.risk_score)} /> {event.risk_score.toFixed(2)}</td>
                <td>{formatTime(event.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
