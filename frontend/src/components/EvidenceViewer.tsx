export default function EvidenceViewer({ path }: { path?: string | null }) {
  return (
    <div className="card">
      <div className="stat-label">Evidence</div>
      <p style={{ color: "var(--muted)" }}>{path ?? "No clip attached — snapshot will appear when an alert is raised from live video."}</p>
    </div>
  );
}
