"""
Gestionnaire de connexions WebSocket SECOMO.
Chaque utilisateur connecté reçoit les événements de SES devices.
"""

import uuid
from fastapi import WebSocket


class WebSocketManager:
    """Gère les connexions WebSocket par user_id."""

    def __init__(self):
        # user_id → liste de WebSocket actifs
        self._connections: dict[uuid.UUID, list[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket):
        if user_id in self._connections:
            self._connections[user_id] = [
                ws for ws in self._connections[user_id] if ws is not websocket
            ]
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send_to_user(self, user_id: uuid.UUID, message: dict):
        """Envoie un message JSON à toutes les connexions d'un utilisateur."""
        if user_id not in self._connections:
            return
        dead: list[WebSocket] = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        # Nettoyer les connexions mortes
        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast_to_device_owner(
        self, user_id: uuid.UUID, event_type: str, device_id: uuid.UUID, data: dict
    ):
        """Envoie un événement typé au propriétaire d'un device."""
        message = {
            "type": event_type,
            "device_id": str(device_id),
            "data": data,
        }
        await self.send_to_user(user_id, message)


# Singleton global
ws_manager = WebSocketManager()
