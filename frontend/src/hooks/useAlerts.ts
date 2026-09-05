import { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api";
import type { Alert } from "../types/alert";

const defaultSampleAlerts: Alert[] = [
  {
    id: "alt-001",
    camera_id: "cam-north-01",
    event_id: "ev-01",
    severity: "CRITICAL",
    risk_score: 0.94,
    event_type: "zone_intrusion",
    title: "Perimeter Exclusion Breach",
    description: "Unidentified person crossed restricted inner security belt on North Fence 01.",
    reason: "Exclusion zone threshold violated. Target moving south towards military post.",
    track_id: 1,
    zone: "Zone 1: Inner Exclusion Belt (100m)",
    trajectory: "Heading 185° S at 1.4 m/s from [34.1534°N, 77.5765°E] directly towards perimeter fence",
    status: "open",
    evidence_path: "data/demo/snap_01.jpg",
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-002",
    camera_id: "cam-west-02",
    event_id: "ev-02",
    severity: "HIGH",
    risk_score: 0.82,
    event_type: "loitering",
    title: "Suspicious Loitering at River Crossing",
    description: "Track lingered in high-risk river crossing zone beyond 40-second dwell limit.",
    reason: "Dwell time 48s exceeds normal traversal pattern. Target scanning perimeter cameras.",
    track_id: 3,
    zone: "Zone 2: River Bank Infiltration Corridor",
    trajectory: "Stationary dwell at river crossing point [34.1405°N, 77.5110°E], erratic micro-movements",
    status: "open",
    evidence_path: "data/demo/snap_02.jpg",
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-003",
    camera_id: "cam-north-01",
    event_id: "ev-03",
    severity: "HIGH",
    risk_score: 0.78,
    event_type: "group_formation",
    title: "Group Cluster Formed Near Fence",
    description: "Cluster of 3+ persons detected assembling 50m north of border barrier.",
    reason: "Spatial clustering detected by SimpleTracker. Coordinated movement profile.",
    track_id: 5,
    zone: "Zone 1: Northern Buffer Strip",
    trajectory: "Converging paths from north-west [34.1540°N, 77.5750°E] to assemble at waypoint Alpha",
    status: "open",
    evidence_path: null,
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-004",
    camera_id: "cam-east-03",
    event_id: "ev-04",
    severity: "SUSPICIOUS",
    risk_score: 0.58,
    event_type: "perimeter_movement",
    title: "Rapid Motion in Mountain Ridge",
    description: "High-velocity signature detected along Eastern Ridge Sector at dusk.",
    reason: "Velocity exceeds human foot-patrol baseline. Possible vehicle or animal signature.",
    track_id: 8,
    zone: "Zone 3: Eastern High Altitude Ridge",
    trajectory: "Traversing east-to-west ridge crest [34.1712°N, 77.6410°E] at 6.8 m/s",
    status: "open",
    evidence_path: null,
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-005",
    camera_id: "cam-west-02",
    event_id: "ev-05",
    severity: "NORMAL",
    risk_score: 0.22,
    event_type: "routine_patrol",
    title: "Friendly Border Security Patrol",
    description: "Scheduled border security force patrol squad passed West Outpost checkpoint.",
    reason: "RFID transponder and scheduled route match authorized sector clearance.",
    track_id: 12,
    zone: "Zone 2: West Outpost Sector Checkpoint",
    trajectory: "Standard patrol route heading 090° East along access road at 1.1 m/s",
    status: "acknowledged",
    evidence_path: "data/demo/patrol_log.jpg",
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-006",
    camera_id: "cam-north-01",
    event_id: "ev-06",
    severity: "CRITICAL",
    risk_score: 0.96,
    event_type: "zone_intrusion",
    title: "Wire Cutting Attempt Detected",
    description: "Tool signature and prolonged fence proximity detected on North Sector Section B.",
    reason: "Computer vision bounding box intersection with physical fence geometry.",
    track_id: 2,
    zone: "Zone 1: Primary Physical Barrier",
    trajectory: "Direct line of approach to barrier section B-12 [34.1528°N, 77.5770°E], stationary contact",
    status: "acknowledged",
    evidence_path: "data/demo/breach_02.jpg",
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
];

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchAlerts()
      .then((data) => {
        if (mounted) {
          if (data && data.length > 0) {
            const existingIds = new Set(data.map((d) => d.id));
            const extra = defaultSampleAlerts.filter((s) => !existingIds.has(s.id));
            setAlerts([...data, ...extra]);
          } else {
            setAlerts(defaultSampleAlerts);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setAlerts(defaultSampleAlerts);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return alerts;
}
