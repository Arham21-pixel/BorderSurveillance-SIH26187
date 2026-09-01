import { useEffect, useState } from "react";
import { fetchSummary } from "../services/api";

export default function Analytics() {
  const [summary, setSummary] = useState<unknown>(null);
  useEffect(() => {
    fetchSummary().then(setSummary).catch(() => undefined);
  }, []);
  return (
    <section>
      <h1>Analytics</h1>
      <p className="sub">Shift-level counts for the jury / operator briefing.</p>
      <div className="card">
        <pre style={{ margin: 0, color: "var(--muted)" }}>{JSON.stringify(summary, null, 2)}</pre>
      </div>
    </section>
  );
}
