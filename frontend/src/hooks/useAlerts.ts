import { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api";
import type { Alert } from "../types/alert";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchAlerts()
      .then((data) => {
        if (mounted) {
          setAlerts(data || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setAlerts([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return alerts;
}
