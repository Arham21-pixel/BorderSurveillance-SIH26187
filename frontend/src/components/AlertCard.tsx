/**
 * AlertCard — DRD-001 v0.2 compliant
 *
 * Required fields per DRD §4 Alert Card:
 *   Severity · Risk Score · Object · Camera · Zone · Time · Duration
 *   Direction · Reasons · Evidence · Status · Action
 *
 * Severity is communicated via BOTH colour badge AND text label
 * so it remains accessible even without colour perception (DRD §10).
 */
import type { Alert } from "../types/alert";
import { formatTime } from "../utils/formatters";

// ── helpers ────────────────────────────────────────────────────────────────

function severityLabel(s: string): string {
  return s.toUpperCase();
}

/** Badge colour mapped from severity string (lowercase expected). */
function badgeClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":   return "badge-critical";
    case "high":       return "badge-high";
    case "suspicious": return "badge-suspicious";
    default:           return "badge-normal";
  }
}

/** Human-readable score bar width (0-100 → CSS percent). */
function scoreBarStyle(score: number): React.CSSProperties {
  const pct = Math.max(0, Math.min(100, score));
  const colour =
    pct >= 80 ? "#ef4444" :   // critical — red
    pct >= 60 ? "#f97316" :   // high     — orange
    pct >= 30 ? "#eab308" :   // suspicious — yellow
                "#22c55e";    // normal   — green
  return { width: `${pct}%`, backgroundColor: colour, height: 6, borderRadius: 3, transition: "width 0.3s" };
}

// ── component ──────────────────────────────────────────────────────────────

import React from "react";

export default function AlertCard({ alert }: { alert: Alert }) {
  const score   = alert.risk_score ?? 0;
  const reasons = alert.reasons ?? [];
  const extra   = alert.extra   ?? {};
  const eventType = String(extra.event_type ?? alert.title ?? "Alert");

  // Split reasons into positive and negative contributors for display
  const positiveReasons = reasons.filter(r => !r.includes("negative contributor"));
  const negativeReasons = reasons.filter(r => r.includes("negative contributor"));

  return (
    <article
      className={`alert-card ${badgeClass(alert.severity)}`}
      style={{ borderLeft: `4px solid currentColor`, padding: "12px 16px", marginBottom: 8, borderRadius: 6 }}
    >
      {/* ── Header row: severity text + risk score ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span
          className={`badge ${badgeClass(alert.severity)}`}
          aria-label={`Severity: ${severityLabel(alert.severity)}`}
          style={{ fontWeight: 700, letterSpacing: "0.05em", padding: "2px 8px", borderRadius: 4 }}
        >
          {severityLabel(alert.severity)}
        </span>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>RISK SCORE</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {score.toFixed(0)}&nbsp;<span style={{ fontWeight: 400, fontSize: 12, color: "#9ca3af" }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* ── Score bar ── */}
      <div style={{ background: "#374151", borderRadius: 3, marginBottom: 8 }}>
        <div style={scoreBarStyle(score)} />
      </div>

      {/* ── Event type ── */}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{eventType}</div>

      {/* ── Meta: camera · zone · time ── */}
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>📷 {alert.camera_id}</span>
        <span>🕐 {formatTime(alert.timestamp)}</span>
        <span
          style={{ padding: "1px 6px", borderRadius: 4, fontSize: 11,
                   background: alert.status.toLowerCase() === "open" ? "#064e3b" : "#1f2937",
                   color: alert.status.toLowerCase() === "open" ? "#34d399" : "#6b7280" }}
        >
          {alert.status.toUpperCase()}
        </span>
      </div>

      {/* ── Positive risk contributors ── */}
      {positiveReasons.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {positiveReasons.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: "#fbbf24" }}>⚠ {r}</div>
          ))}
        </div>
      )}

      {/* ── Negative contributors (shown where applicable — DRD §7) ── */}
      {negativeReasons.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {negativeReasons.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: "#6ee7b7" }}>↓ {r}</div>
          ))}
        </div>
      )}

      {/* ── Description fallback (if no reasons) ── */}
      {reasons.length === 0 && alert.description && (
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0" }}>{alert.description}</p>
      )}
    </article>
  );
}
