/**
 * Alert shape used by the frontend.
 *
 * DRD-001 (v0.2) alert-card requirements:
 *   Severity, Risk Score, Object, Camera, Zone, Time, Duration,
 *   Direction, Reasons, Evidence, Status, Action
 */
export type Alert = {
  id: string;
  camera_id: string;
  event_id: string;
  /** Backend values: NORMAL | SUSPICIOUS | HIGH | CRITICAL (normalised to lowercase by api.ts) */
  severity: "normal" | "suspicious" | "high" | "critical" | string;
  title?: string;
  description?: string;
  status: string;
  evidence_path?: string | null;
  timestamp: string;
  created_at?: string;
  /** 0-100 score from the risk engine */
  risk_score?: number;
  /** Human-readable reasons from the risk engine */
  reasons?: string[];
  /** Extra metadata (event_type etc.) */
  extra?: Record<string, unknown>;
};
