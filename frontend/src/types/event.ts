export type EventItem = {
  id: string;
  camera_id: string;
  track_id?: number | null;
  kind: string;
  description: string;
  risk_score: number;
  timestamp: string;
  zone?: string;
  evidence_path?: string | null;
};
