interface RiskBadgeProps {
  severity: string;
  size?: "sm" | "md";
}

export function normalizeSeverity(sev: string): "CRITICAL" | "HIGH" | "SUSPICIOUS" | "NORMAL" {
  const upper = (sev || "").toUpperCase();
  if (upper === "CRITICAL" || upper === "CRIT") return "CRITICAL";
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM" || upper === "SUSPICIOUS" || upper === "MED" || upper === "WARN") return "SUSPICIOUS";
  return "NORMAL";
}

export default function RiskBadge({ severity, size = "sm" }: RiskBadgeProps) {
  const norm = normalizeSeverity(severity);

  const styleMap = {
    CRITICAL: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/25",
    SUSPICIOUS: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    NORMAL: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  };

  const dotMap = {
    CRITICAL: "bg-rose-400 animate-pulse",
    HIGH: "bg-orange-400",
    SUSPICIOUS: "bg-amber-400",
    NORMAL: "bg-emerald-400",
  };

  const labelMap = {
    CRITICAL: "Critical",
    HIGH: "High",
    SUSPICIOUS: "Medium",
    NORMAL: "Normal",
  };

  const sizeClasses = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-normal ${styleMap[norm]} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotMap[norm]}`} />
      {labelMap[norm]}
    </span>
  );
}
