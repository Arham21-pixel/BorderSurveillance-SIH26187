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
    CRITICAL: "bg-[#FF4D67]/10 text-[#FF4D67] border-[#FF4D67]/25",
    HIGH: "bg-[#FF8A2A]/10 text-[#FF8A2A] border-[#FF8A2A]/25",
    SUSPICIOUS: "bg-[#F2C94C]/10 text-[#F2C94C] border-[#F2C94C]/25",
    NORMAL: "bg-[#35D07F]/10 text-[#35D07F] border-[#35D07F]/25",
  };

  const dotMap = {
    CRITICAL: "bg-[#FF4D67] animate-pulse",
    HIGH: "bg-[#FF8A2A]",
    SUSPICIOUS: "bg-[#F2C94C]",
    NORMAL: "bg-[#35D07F]",
  };

  const labelMap = {
    CRITICAL: "Critical",
    HIGH: "High",
    SUSPICIOUS: "Suspicious",
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
