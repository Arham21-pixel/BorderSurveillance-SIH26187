import { useEffect, useState } from "react";
import { fetchEvents } from "../services/api";
import type { EventItem } from "../types/event";

const DEMO_EVENTS: EventItem[] = [
  {
    id: "EVT-1042",
    camera_id: "DEMO-01",
    track_id: 17,
    kind: "zone_intrusion",
    description: "Restricted zone entry detected for Track 17.",
    risk_score: 0.72,
    timestamp: new Date().toISOString(),
    zone: "Restricted Zone A",
  },
  {
    id: "EVT-1043",
    camera_id: "DEMO-02",
    track_id: 11,
    kind: "loitering",
    description: "Loitering detected near entry boundary.",
    risk_score: 0.46,
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    zone: "Demo Sector Gate",
  },
];

export function useEvents(limit: number = 10) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchEvents(limit)
      .then((data) => {
        if (mounted) {
          setEvents(data && data.length > 0 ? data : DEMO_EVENTS.slice(0, limit));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setEvents(DEMO_EVENTS.slice(0, limit));
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [limit]);

  return { events, isLoading };
}
