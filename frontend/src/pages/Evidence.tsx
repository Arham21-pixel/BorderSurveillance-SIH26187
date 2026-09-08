import { useState } from "react";
import { useAlerts } from "../hooks/useAlerts";
import EvidenceViewer from "../components/EvidenceViewer";
import RiskBadge from "../components/RiskBadge";
import { formatTime } from "../utils/formatters";
import { FileSearch, Video, Calendar, Camera } from "lucide-react";

export default function Evidence() {
  const alerts = useAlerts();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? alerts[0];

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="pb-4 border-b border-white/[0.06]">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
          Evidence & Forensic Archive
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Cryptographically referenced snapshot captures and video event clips tied to border security alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence List / Audit Log */}
        <div className="lg:col-span-1 bg-[#101820] border border-white/[0.07] rounded-2xl p-5 flex flex-col h-[640px] shadow-xl">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-[#20D5C5]" />
              Archived Packages ({alerts.length})
            </span>
          </div>

          <div className="mt-3.5 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center h-full">
                <FileSearch className="w-8 h-8 text-slate-600 mb-2" />
                <span className="font-medium text-slate-300">No evidence packages archived.</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Incident clips and snapshots will populate as security events occur.
                </span>
              </div>
            ) : (
              alerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#141E28] border-[#20D5C5]/40 shadow-lg shadow-black/30"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <RiskBadge severity={alert.severity} />
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white line-clamp-1">
                      {alert.title}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-[#20D5C5]">
                        <Camera className="w-3 h-3" />
                        {alert.camera_id}
                      </span>
                      <span>•</span>
                      <span className="text-[#39D98A]">
                        {alert.evidence_path ? "Clip Ready" : "Snapshot"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Evidence Detail / Media Inspection Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAlert ? (
            <>
              <EvidenceViewer path={selectedAlert.evidence_path} />

              <div className="bg-[#101820] border border-white/[0.07] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#20D5C5]" />
                    Incident Telemetry Record
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {selectedAlert.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">CAMERA</div>
                    <div className="font-semibold text-white mt-1">{selectedAlert.camera_id}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">STATUS</div>
                    <div className="font-semibold text-[#39D98A] mt-1 uppercase">{selectedAlert.status}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">SEVERITY</div>
                    <div className="font-semibold text-rose-400 mt-1 uppercase">{selectedAlert.severity}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">TIMESTAMP</div>
                    <div className="font-semibold text-white mt-1">{formatTime(selectedAlert.timestamp)}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="font-semibold text-white">Incident Narrative: </span>
                  {selectedAlert.description}
                </div>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center p-8 bg-[#101820] border border-white/[0.07] rounded-2xl text-center text-xs text-slate-400 shadow-xl">
              <Video className="w-12 h-12 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-white">No Forensic Evidence Selected</div>
              <div className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Select an archived alert package to inspect authenticated video telemetry, high-resolution snapshots, and track audit trails.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
