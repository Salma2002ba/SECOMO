"""
Endpoint WebSocket SECOMO.
Le frontend se connecte avec son JWT pour recevoir les événements temps réel.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session
from app.models.user import User
from app.utils.websocket_manager import ws_manager

router = APIRouter(tags=["websocket"])

settings = get_settings()


@router.websocket("/api/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    # Authentifier via JWT
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=4001, reason="Token invalide")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Token invalide")
        return

    # Vérifier que l'utilisateur existe
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            await websocket.close(code=4001, reason="Utilisateur introuvable")
            return
        uid = user.id

    # Connecter
    await ws_manager.connect(uid, websocket)

    try:
        # Garder la connexion ouverte — écouter les pings/messages client
        while True:
            data = await websocket.receive_text()
            # Le client peut envoyer des pings, on les ignore
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(uid, websocket)
