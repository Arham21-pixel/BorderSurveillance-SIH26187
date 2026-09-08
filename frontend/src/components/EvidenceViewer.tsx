import { FileSearch, ShieldCheck } from "lucide-react";

export default function EvidenceViewer({ path }: { path?: string | null }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileSearch className="w-3.5 h-3.5 text-[#20D5C5]" />
          Evidence Package
        </span>
        {path && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#39D98A] border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed font-mono break-all">
        {path ?? "No clip attached — snapshot will appear when an alert is raised from live video."}
      </p>
    </div>
  );
}
