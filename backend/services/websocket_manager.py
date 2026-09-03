"""Simple in-process WebSocket broadcast manager."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import WebSocket


class AlertWebSocketManager:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        async with self._lock:
            clients = list(self._clients)

        stale: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_json(message)
            except Exception:
                stale.append(client)

        if stale:
            async with self._lock:
                for client in stale:
                    self._clients.discard(client)


alert_ws_manager = AlertWebSocketManager()
