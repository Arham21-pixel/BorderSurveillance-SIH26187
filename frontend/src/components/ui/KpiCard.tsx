import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "accent" | "normal" | "suspicious" | "high" | "critical";
}

const valueTone: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-netra-text",
  accent: "text-netra-accent",
  normal: "text-netra-normal",
  suspicious: "text-netra-suspicious",
  high: "text-netra-high",
  critical: "text-netra-critical",
};

export default function KpiCard({ label, value, hint, icon, tone = "default" }: KpiCardProps) {
  return (
    <div className="n-card p-4 sm:p-5 flex flex-col justify-between min-h-[108px] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-netra-accent/50 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <span className="n-label">{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-netra-accent/10 border border-netra-accent/20 flex items-center justify-center text-netra-accent shadow-[0_0_16px_-6px_rgba(38,229,229,0.9)]">
            {icon}
          </div>
        )}
      </div>
      <div className={`n-kpi mt-3 ${valueTone[tone]}`}>{value}</div>
      {hint && <div className="mt-2 text-[11px] text-netra-muted">{hint}</div>}
    </div>
  );
}
