import AlertCard from "./AlertCard";
import type { Alert } from "../types/alert";
import { ShieldCheck } from "lucide-react";

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  onSelect?: (alert: Alert) => void;
  selectedAlertId?: string;
}

export default function AlertPanel({
  alerts,
  onAcknowledge,
  onSelect,
  selectedAlertId,
}: AlertPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="p-8 text-center bg-[#101820] border border-white/[0.06] rounded-2xl text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
        <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#39D98A]">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <p className="font-medium text-slate-300">All Clear</p>
        <p className="text-[11px] text-slate-500">No incidents matching current criteria in this sector.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={onAcknowledge}
          onSelect={onSelect}
          isSelected={alert.id === selectedAlertId}
        />
      ))}
    </div>
  );
}
