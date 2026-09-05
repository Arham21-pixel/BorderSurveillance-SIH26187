export type SeverityLevel = "CRITICAL" | "HIGH" | "SUSPICIOUS" | "NORMAL" | string;

export type Alert = {
  id: string;
  camera_id: string;
  event_id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  status: string;
  risk_score?: number;
  event_type?: string;
  reason?: string;
  track_id?: number | null;
  zone?: string;
  trajectory?: string;
  evidence_path?: string | null;
  timestamp: string;
};
