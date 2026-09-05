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
    CRITICAL: "bg-[#3a1212] text-[#ff4d4d] border-[#ff4d4d]/50",
    HIGH: "bg-[#3a1515] text-[#ff5a5a] border-[#ff5a5a]/40",
    SUSPICIOUS: "bg-[#3a2e12] text-[#f5b942] border-[#f5b942]/40",
    NORMAL: "bg-[#14321c] text-[#5ad67a] border-[#5ad67a]/40",
  };

  const sizeClasses = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase rounded border tracking-wider ${styleMap[norm]} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          norm === "CRITICAL" ? "bg-[#ff4d4d] animate-ping" : norm === "HIGH" ? "bg-[#ff5a5a]" : norm === "SUSPICIOUS" ? "bg-[#f5b942]" : "bg-[#5ad67a]"
        }`}
      />
      {norm}
    </span>
  );
}
