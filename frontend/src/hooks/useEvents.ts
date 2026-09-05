import { useEffect, useState } from "react";
import { fetchEvents } from "../services/api";
import type { EventItem } from "../types/event";

export function useEvents(limit: number = 10) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchEvents(limit)
      .then((data) => {
        if (mounted) {
          setEvents(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          // Fallback mock events for offline/demo reliability
          setEvents([
            {
              id: "ev-01",
              camera_id: "cam-north-01",
              track_id: 1,
              kind: "zone_intrusion",
              description: "Person entered restricted border belt",
              risk_score: 0.88,
              timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
            },
            {
              id: "ev-02",
              camera_id: "cam-west-02",
              track_id: 3,
              kind: "loitering",
              description: "Track lingered beyond dwell threshold near river bank",
              risk_score: 0.62,
              timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
            },
            {
              id: "ev-03",
              camera_id: "cam-north-01",
              track_id: 4,
              kind: "group",
              description: "Cluster of 3+ persons detected near fence perimeter",
              risk_score: 0.76,
              timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
            },
          ]);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [limit]);

  return { events, isLoading };
}
