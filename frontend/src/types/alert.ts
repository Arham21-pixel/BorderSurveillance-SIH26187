export type Alert = {
  id: string;
  camera_id: string;
  event_id: string;
  severity: "high" | "medium" | "low" | string;
  title: string;
  description: string;
  status: string;
  evidence_path?: string | null;
  timestamp: string;
};
