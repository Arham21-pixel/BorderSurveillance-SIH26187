/**
 * RiskBadge — renders a colour-and-text severity badge.
 *
 * DRD-001 §10: severity must NEVER be communicated by colour alone.
 * This component always renders the severity text label too.
 *
 * Accepts both lowercase ("critical") and uppercase ("CRITICAL").
 * PRD-001 / TRD-001 v0.2 severity bands:
 *   normal · suspicious · high · critical
 */

const STYLES: Record<string, { bg: string; color: string; label: string }> = {
  critical:   { bg: "#7f1d1d", color: "#fca5a5", label: "CRITICAL" },
  high:       { bg: "#7c2d12", color: "#fdba74", label: "HIGH" },
  suspicious: { bg: "#713f12", color: "#fde047", label: "SUSPICIOUS" },
  normal:     { bg: "#14532d", color: "#86efac", label: "NORMAL" },
};

export default function RiskBadge({ severity }: { severity: string }) {
  const key = severity.toLowerCase();
  const style = STYLES[key] ?? STYLES["normal"];

  return (
    <span
      className={`badge badge-${key}`}
      style={{
        background: style.bg,
        color: style.color,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
      aria-label={`Severity: ${style.label}`}
    >
      {style.label}
    </span>
  );
}
