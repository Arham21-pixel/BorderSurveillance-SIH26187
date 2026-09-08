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
          setEvents(data || []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setEvents([]);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [limit]);

  return { events, isLoading };
}
