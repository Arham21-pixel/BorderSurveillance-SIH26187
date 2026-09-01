import AlertCard from "./AlertCard";
import type { Alert } from "../types/alert";

export default function AlertPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
