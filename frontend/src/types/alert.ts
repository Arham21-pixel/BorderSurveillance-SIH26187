export type SeverityLevel = "CRITICAL" | "HIGH" | "SUSPICIOUS" | "NORMAL" | string;

export interface RiskContributor {
  signal: string;
  delta: number;
  description?: string;
}

export type Alert = {
  id: string;
  camera_id: string;
  event_id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  status: string;
  risk_score?: number;
  risk_breakdown?: RiskContributor[];
  event_type?: string;
  reason?: string;
  track_id?: number | null;
  zone?: string;
  trajectory?: string;
  evidence_path?: string | null;
  timestamp: string;
};

