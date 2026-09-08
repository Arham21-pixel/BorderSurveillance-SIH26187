import { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api";
import type { Alert } from "../types/alert";

const DEMO_ALERTS: Alert[] = [
  {
    id: "ALT-1042",
    camera_id: "DEMO-01",
    event_id: "EVT-1042",
    severity: "HIGH",
    title: "Restricted Zone Entry",
    description: "Person crossed into Restricted Zone A near boundary marker.",
    status: "open",
    risk_score: 0.72,
    reason: "+40 Restricted-zone entry, +20 Loitering, +10 Night-time context, +02 Direction/context",
    event_type: "zone_intrusion",
    track_id: 17,
    zone: "Restricted Zone A",
    trajectory: "Movement path from outer perimeter into restricted zone boundary.",
    evidence_path: "demo_snapshot_1042.jpg",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ALT-1043",
    camera_id: "DEMO-02",
    event_id: "EVT-1043",
    severity: "SUSPICIOUS",
    title: "Loitering Near Zone Boundary",
    description: "Extended dwell time detected near sector gate.",
    status: "open",
    risk_score: 0.46,
    reason: "Prolonged stationary presence in monitoring zone.",
    event_type: "loitering",
    track_id: 11,
    zone: "Demo Sector Gate",
    trajectory: "Small circular motion near boundary line.",
    evidence_path: null,
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
];

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchAlerts()
      .then((data) => {
        if (mounted) {
          setAlerts(data && data.length > 0 ? data : DEMO_ALERTS);
        }
      })
      .catch(() => {
        if (mounted) {
          setAlerts(DEMO_ALERTS);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return alerts;
}
