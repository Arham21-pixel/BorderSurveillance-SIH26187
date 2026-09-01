export function connectSocket(onMessage: (data: unknown) => void): WebSocket | null {
  const url = import.meta.env.VITE_WS_URL ?? `${location.origin.replace("http", "ws")}/ws`;
  try {
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        onMessage(event.data);
      }
    };
    return ws;
  } catch {
    return null;
  }
}
