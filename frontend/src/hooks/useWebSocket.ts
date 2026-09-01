import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../services/websocket";

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    socket.current = connectSocket((data) => setLastMessage(data));
    return () => socket.current?.close();
  }, []);

  return { lastMessage };
}
