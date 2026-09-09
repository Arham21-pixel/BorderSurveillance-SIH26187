import { useState } from "react";
import { useAlerts } from "../hooks/useAlerts";
import EvidenceViewer from "../components/EvidenceViewer";
import RiskBadge, { normalizeSeverity } from "../components/RiskBadge";
import { formatTime } from "../utils/formatters";
import { FileSearch, Video, Calendar, Camera, Route, Image } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import LiveBadge from "../components/ui/LiveBadge";

type ViewerTab = "snapshot" | "clip" | "trajectory" | "metadata";

export default function Evidence() {
  const alerts = useAlerts();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewerTab>("snapshot");

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? alerts[0];
  const risk = selectedAlert
    ? selectedAlert.risk_score != null && selectedAlert.risk_score <= 1
      ? Math.round(selectedAlert.risk_score * 100)
      : Math.round(selectedAlert.risk_score ?? 0)
    : 0;

  const tabs: { id: ViewerTab; label: string; icon: typeof Image }[] = [
    { id: "snapshot", label: "Snapshot", icon: Image },
    { id: "clip", label: "Video Clip", icon: Video },
    { id: "trajectory", label: "Trajectory", icon: Route },
    { id: "metadata", label: "Event Metadata", icon: FileSearch },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Archive"
        subtitle="Snapshots, clips and trajectories taken from the camera at the moment of the alert."
        badge={<LiveBadge label="FROM CAMERA FEEDS" tone="live" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="n-card p-5 flex flex-col h-[640px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-netra-accent/12">
            <span className="text-[13px] font-semibold text-netra-text flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-netra-accent" />
              Evidence list ({alerts.length})
            </span>
          </div>

          <div className="mt-3.5 flex-1 overflow-y-auto space-y-2 pr-1">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-netra-muted flex flex-col items-center justify-center h-full">
                <FileSearch className="w-8 h-8 text-netra-muted2 mb-2" />
                <span className="font-medium text-netra-text">No evidence archived.</span>
                <span className="text-[11px] mt-1">
                  Event clips and snapshots populate as alerts are generated.
                </span>
              </div>
            ) : (
              alerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "n-card-2 border-netra-accent/40"
                        : "bg-transparent border-netra-accent/10 hover:border-netra-accent/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <RiskBadge severity={alert.severity} />
                      <span className="text-[10px] font-mono text-netra-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-netra-text line-clamp-1">{alert.title}</div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-netra-muted">
                      <span className="flex items-center gap-1 text-netra-accent">
                        <Camera className="w-3 h-3" />
                        {alert.camera_id}
                      </span>
                      <span>{alert.snapshot_url || alert.clip_url ? "Media" : "Log"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {selectedAlert ? (
            <>
              <div className="n-card p-5">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tabs.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border ${
                          active
                            ? "bg-netra-accent/15 text-netra-accent border-netra-accent/30"
                            : "text-netra-muted border-netra-line hover:text-netra-text"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {tab === "metadata" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <Meta label="Alert ID" value={selectedAlert.id} />
                    <Meta label="Camera" value={selectedAlert.camera_id} />
                    <Meta label="Zone" value={selectedAlert.zone || "—"} />
                    <Meta label="Timestamp" value={formatTime(selectedAlert.timestamp)} />
                    <Meta label="Object" value={selectedAlert.object_class || selectedAlert.event_type || "person"} />
                    <Meta label="Track ID" value={String(selectedAlert.track_id ?? "—")} />
                    <Meta label="Risk score" value={String(risk)} />
                    <Meta label="Severity" value={normalizeSeverity(selectedAlert.severity)} />
                    <Meta label="Lighting" value={selectedAlert.night ? "Night / low-light" : "Day"} />
                    <Meta label="Source clip" value={selectedAlert.clip_name || "Live camera"} />
                  </div>
                ) : (
                  <EvidenceViewer alert={selectedAlert} path={selectedAlert.evidence_path} tab={tab} />
                )}
              </div>

              <div className="n-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-netra-line">
                  <h3 className="text-[13px] font-semibold text-netra-text">Event metadata</h3>
                  <RiskBadge severity={selectedAlert.severity} />
                </div>
                <p className="text-xs text-netra-muted leading-relaxed">
                  {selectedAlert.description}
                </p>
                {selectedAlert.reason && (
                  <div>
                    <div className="n-label mb-1">Reasons</div>
                    <p className="text-xs text-netra-text">{selectedAlert.reason}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center p-8 n-card text-center text-xs text-netra-muted">
              <Video className="w-12 h-12 text-netra-muted2 mb-3" />
              <div className="text-sm font-semibold text-netra-text">No Evidence Selected</div>
              <div className="text-[11px] mt-1 max-w-sm">
                Select an alert to inspect its evidence and event details.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="n-card-2 p-3">
      <div className="n-label">{label}</div>
      <div className="font-semibold text-netra-text mt-1 truncate" title={value}>{value}</div>
    </div>
  );
}
