import { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api";
import type { Alert } from "../types/alert";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    fetchAlerts().then(setAlerts).catch(() => {
      setAlerts([
        {
          id: "local-1",
          camera_id: "cam-north-01",
          event_id: "local",
          severity: "high",
          title: "Restricted zone entry",
          description: "Person crossed the inner fence belt on North Fence 01.",
          status: "open",
          timestamp: new Date().toISOString(),
        },
      ]);
    });
  }, []);
  return alerts;
}
