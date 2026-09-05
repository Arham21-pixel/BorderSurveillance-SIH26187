export type BoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Detection = {
  track_id?: number | null;
  label: string;
  confidence: number;
  bbox: BoundingBox;
};

export type DetectionResult = {
  camera_id: string;
  timestamp: string;
  detections: Detection[];
};
