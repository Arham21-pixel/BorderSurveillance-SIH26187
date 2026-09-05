export interface AnalyticsSummary {
  cameras_online: number;
  cameras_total: number;
  alerts_open: number;
  alerts_by_severity: {
    high: number;
    medium: number;
    low: number;
    [key: string]: number;
  };
}

export interface SectorThreatData {
  sector: string;
  alerts: number;
  events: number;
}

export interface TimelineDataPoint {
  time: string;
  intrusions: number;
  loitering: number;
  groups: number;
}
