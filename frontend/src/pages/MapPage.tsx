import { useCameras } from "../hooks/useCameras";
import { useAlerts } from "../hooks/useAlerts";
import CameraMap from "../components/CameraMap";
import { MapPin, Radio } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import LiveBadge from "../components/ui/LiveBadge";
import { SECTOR_COORDS_LABEL, SECTOR_NAME, SECTOR_REGION } from "../lib/constants";

export default function MapPage() {
  const cameras = useCameras();
  const alerts = useAlerts();

  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surveillance Sector Map"
        subtitle={`Prototype sector on the ${SECTOR_REGION}–Pakistan IB belt (${SECTOR_NAME}), with fence, restricted strip, patrol path and camera cones.`}
        badge={
          <>
            <LiveBadge label="SECTOR OVERVIEW" tone="live" />
            <span className="text-[11px] font-mono text-netra-muted">
              {SECTOR_REGION} · {SECTOR_COORDS_LABEL}
            </span>
          </>
        }
        actions={
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl n-card-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-netra-normal" />
              <span className="text-netra-text font-semibold font-mono">
                {cameras.filter((c) => c.status === "online").length}
              </span>
              <span className="text-netra-muted">Online</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl n-card-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-netra-critical" />
              <span className="text-netra-critical font-semibold font-mono">{openAlerts.length}</span>
              <span className="text-netra-muted">Alerts</span>
            </div>
          </div>
        }
      />

      <div className="n-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-netra-accent/12 mb-4">
          <span className="text-[13px] font-semibold text-netra-text flex items-center gap-2">
            <MapPin className="w-4 h-4 text-netra-accent" />
            Operational sector map
          </span>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium">
            <LegendDot color="bg-netra-accent" label="Fence" />
            <LegendDot color="bg-netra-critical" label="Restricted" />
            <LegendDot color="bg-netra-suspicious" label="Patrol" />
            <LegendDot color="bg-netra-normal" label="Camera" />
            <LegendDot color="bg-netra-high" label={`Alerts ${openAlerts.length}`} />
          </div>
        </div>

        <div className="h-[520px] rounded-xl overflow-hidden border border-netra-line">
          <CameraMap cameras={cameras} alerts={openAlerts} />
        </div>

        <div className="mt-5 pt-4 border-t border-netra-line">
          {cameras.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-netra-muted">
              No cameras registered in this sector yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="p-3.5 rounded-xl bg-netra-card2 border border-netra-line flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Radio className={`w-4 h-4 ${cam.status === "online" ? "text-netra-normal" : "text-netra-muted2"}`} />
                    <div>
                      <div className="text-xs font-semibold text-netra-text">{cam.name}</div>
                      <div className="text-[11px] font-mono text-netra-muted capitalize">Zone: {cam.sector}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
                      cam.status === "online"
                        ? "bg-netra-normal/10 text-netra-normal border-netra-normal/20"
                        : "bg-netra-card text-netra-muted border-netra-line"
                    }`}
                  >
                    {cam.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-netra-muted">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
