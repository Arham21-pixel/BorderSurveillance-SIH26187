from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.websocket_manager import alert_ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket) -> None:
    await alert_ws_manager.connect(websocket)
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        await alert_ws_manager.disconnect(websocket)
    except Exception:
        await alert_ws_manager.disconnect(websocket)
