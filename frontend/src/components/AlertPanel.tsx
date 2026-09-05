import AlertCard from "./AlertCard";
import type { Alert } from "../types/alert";

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
      <div className="p-8 text-center bg-[#101820] border border-[#243140] rounded-xl text-[#8fa3b8] font-mono text-xs">
        No incidents matching current criteria in this sector.
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
