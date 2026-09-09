import { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api";
import type { Alert } from "../types/alert";
import { useDemoSessionOptional } from "../contexts/DemoSessionContext";

export function useAlerts() {
  const session = useDemoSessionOptional();
  const [apiAlerts, setApiAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchAlerts()
      .then((data) => {
        if (mounted) setApiAlerts(data ?? []);
      })
      .catch(() => {
        if (mounted) setApiAlerts([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const live = session?.alerts;
  if (session) return live ?? [];
  return apiAlerts;
}