import type { RiskContributor } from "../types/alert";
import { ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, ShieldAlert } from "lucide-react";

interface RiskBreakdownProps {
  breakdown?: RiskContributor[];
  className?: string;
}

export default function RiskBreakdown({ breakdown, className = "" }: RiskBreakdownProps) {
  const items = breakdown || [];

  const positiveContributors = items.filter((item) => item.delta > 0);
  const negativeContributors = items.filter((item) => item.delta < 0);

  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-[#0c141c] border border-[#243140] space-y-4 ${className}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#243140]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#3dd6c6]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#e8eef5]">
            Risk Attribution & Signal Breakdown
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#8fa3b8]">
          AUTONOMOUS INTELLIGENCE EXPLAINABILITY
        </span>
      </div>

      <p className="text-xs text-[#8fa3b8] leading-relaxed">
        Granular contributing factors computed by the intelligence risk engine. Positive signals escalate the threat level, while suppressing signals penalize or downgrade false alarms.
      </p>

      {items.length === 0 ? (
        <div className="py-6 text-center font-mono text-xs text-[#8fa3b8] bg-[#101820] rounded-lg border border-[#1b2b3a]">
          No explicit risk factors registered for this incident record.
        </div>
      ) : (
        /* Breakdown Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Positive Contributing Factors */}
        <div className="space-y-2.5 p-3 rounded-lg bg-[#101820] border border-[#1b2b3a]">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#5ad67a] pb-1.5 border-b border-[#243140]/60">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#5ad67a]" />
              Threat Escalators (Positive)
            </span>
            <span>+{positiveContributors.reduce((acc, curr) => acc + curr.delta, 0)} pts</span>
          </div>

          <div className="space-y-1.5">
            {positiveContributors.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-[#0c141c] border border-[#243140] hover:border-[#5ad67a]/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-[#14321c] text-[#5ad67a] shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#e8eef5] truncate">
                      {item.signal}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-[#8fa3b8] truncate font-mono">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>

                <span className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#14321c] text-[#5ad67a] border border-[#5ad67a]/50">
                  +{item.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Negative / Suppressing Factors */}
        <div className="space-y-2.5 p-3 rounded-lg bg-[#101820] border border-[#1b2b3a]">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#ff7a7a] pb-1.5 border-b border-[#243140]/60">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff7a7a]" />
              Threat Suppressors (Negative)
            </span>
            <span>{negativeContributors.reduce((acc, curr) => acc + curr.delta, 0)} pts</span>
          </div>

          <div className="space-y-1.5">
            {negativeContributors.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-[#0c141c] border border-[#243140] hover:border-[#ff5a5a]/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-[#3a1515] text-[#ff7a7a] shrink-0">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#e8eef5] truncate">
                      {item.signal}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-[#8fa3b8] truncate font-mono">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>

                <span className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#3a1515] text-[#ff7a7a] border border-[#ff5a5a]/50">
                  {item.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="text-[10px] font-mono text-[#8fa3b8] flex items-center justify-between pt-2 border-t border-[#243140]/60">
        <span>MODEL: MULTI-SIGNAL FUSION ENGINE</span>
        <span className="text-[#3dd6c6]">DELTAS NORMALIZED IN RISK SCORE</span>
      </div>
    </div>
  );
}
