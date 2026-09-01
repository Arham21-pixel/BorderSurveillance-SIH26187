import { useAlerts } from "../hooks/useAlerts";
import AlertPanel from "../components/AlertPanel";
import EvidenceViewer from "../components/EvidenceViewer";
import { ackAlert } from "../services/api";

export default function Alerts() {
  const alerts = useAlerts();
  const selected = alerts[0];
  return (
    <section>
      <h1>Alerts</h1>
      <p className="sub">Human review required. High-severity items stay in queue until acknowledged.</p>
      <div className="grid two">
        <AlertPanel alerts={alerts} />
        <div>
          <EvidenceViewer path={selected?.evidence_path} />
          {selected && selected.status === "open" && (
            <button style={{ marginTop: 12 }} onClick={() => ackAlert(selected.id)}>Acknowledge</button>
          )}
        </div>
      </div>
    </section>
  );
}
