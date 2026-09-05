export type EventItem = {
  id: string;
  camera_id: string;
  track_id?: string | number | null;
  kind: string;
  description: string;
  risk_score: number;
  timestamp: string;
};
