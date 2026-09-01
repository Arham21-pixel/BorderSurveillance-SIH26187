export type Detection = {
  track_id?: number | null;
  label: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
};
