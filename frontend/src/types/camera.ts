export type Camera = {
  id: string;
  name: string;
  source: string;
  latitude?: number | null;
  longitude?: number | null;
  sector: string;
  status: string;
  last_seen?: string | null;
  stream_url?: string | null;
  webrtc_url?: string | null;
  hls_url?: string | null;
};
