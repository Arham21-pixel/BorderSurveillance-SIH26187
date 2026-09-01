export type Camera = {
  id: string;
  name: string;
  source: string;
  latitude?: number | null;
  longitude?: number | null;
  sector: string;
  status: string;
  last_seen?: string | null;
};
