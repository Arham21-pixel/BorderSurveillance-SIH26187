interface LiveBadgeProps {
  label?: string;
  tone?: "live" | "demo" | "idle";
}

export default function LiveBadge({ label = "LIVE MONITORING", tone = "live" }: LiveBadgeProps) {
  const styles =
    tone === "demo"
      ? "bg-netra-suspicious/10 text-netra-suspicious border-netra-suspicious/25"
      : tone === "idle"
      ? "bg-white/[0.03] text-netra-muted border-netra-line"
      : "bg-netra-normal/10 text-netra-normal border-netra-normal/25";

  const dot =
    tone === "demo"
      ? "bg-netra-suspicious"
      : tone === "idle"
      ? "bg-netra-muted2"
      : "bg-netra-normal animate-pulse";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
