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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
          Evidence & Forensic Archive
        </h1>
        <p className="text-xs sm:text-sm text-[#8fa3b8] mt-1">
          Cryptographically referenced snapshot captures and video event clips tied to border security alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence List / Audit Log */}
        <div className="lg:col-span-1 bg-[#101820] border border-[#243140] rounded-xl p-4 flex flex-col h-[640px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#243140]">
            <span className="text-xs font-mono font-bold uppercase text-[#8fa3b8] flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-[#3dd6c6]" />
              Archived Packages ({alerts.length})
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {alerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#16202b] border-[#3dd6c6]/50 shadow-md"
                      : "bg-[#0c141c] border-[#243140] hover:border-[#3dd6c6]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <RiskBadge severity={alert.severity} />
                    <span className="text-[10px] font-mono text-[#8fa3b8] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[#e8eef5] line-clamp-1">
                    {alert.title}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[#8fa3b8]">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3 text-[#3dd6c6]" />
                      {alert.camera_id}
                    </span>
                    <span>•</span>
                    <span className="text-[#3dd6c6]">
                      {alert.evidence_path ? "CLIP READY" : "SNAPSHOT"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evidence Detail / Media Inspection Panel */}
        <div className="lg:col-span-2 space-y-6">
          <EvidenceViewer path={selectedAlert?.evidence_path} />

          {selectedAlert && (
            <div className="bg-[#101820] border border-[#243140] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#243140]">
                <h3 className="text-sm font-bold text-[#e8eef5] flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#3dd6c6]" />
                  Incident Telemetry Record
                </h3>
                <span className="text-xs font-mono text-[#8fa3b8]">
                  ID: {selectedAlert.id}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8]">CAMERA</div>
                  <div className="font-bold text-[#e8eef5] mt-0.5">{selectedAlert.camera_id}</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8]">STATUS</div>
                  <div className="font-bold text-[#5ad67a] mt-0.5 uppercase">{selectedAlert.status}</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8]">SEVERITY</div>
                  <div className="font-bold text-[#ff5a5a] mt-0.5 uppercase">{selectedAlert.severity}</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8]">TIMESTAMP</div>
                  <div className="font-bold text-[#e8eef5] mt-0.5">{formatTime(selectedAlert.timestamp)}</div>
                </div>
              </div>

              <div className="text-xs text-[#8fa3b8] leading-relaxed p-3 rounded bg-[#0c141c] border border-[#243140]">
                <span className="font-semibold text-[#e8eef5]">Incident Narrative: </span>
                {selectedAlert.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
