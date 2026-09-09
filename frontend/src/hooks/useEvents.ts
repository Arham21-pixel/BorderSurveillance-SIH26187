import { useEffect, useState } from "react";
import { fetchEvents } from "../services/api";
import type { EventItem } from "../types/event";
import { useDemoSessionOptional } from "../contexts/DemoSessionContext";

export function useEvents(limit: number = 10) {
  const session = useDemoSessionOptional();
  const [apiEvents, setApiEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchEvents(limit)
      .then((data) => {
        if (mounted) {
          setApiEvents(data ?? []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setApiEvents([]);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [limit]);

  const live = session?.events ?? [];
  if (session) return { events: live.slice(0, limit), isLoading: false };
  return { events: apiEvents.slice(0, limit), isLoading };
}