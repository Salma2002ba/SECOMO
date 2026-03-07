import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.command import Command
from app.models.device import Device
from app.models.user import User
from app.schemas.command import CommandCreate, CommandOut, CommandAck
from app.utils.auth import get_current_user
from app.utils.esp_auth import get_device_by_api_key

router = APIRouter(tags=["commands"])


# --- ESP32 poll pour récupérer les commandes en attente ---

@router.get("/api/esp/commands", response_model=list[CommandOut])
async def get_pending_commands(
    device: Device = Depends(get_device_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Command)
        .where(Command.device_id == device.id, Command.status == "PENDING")
        .order_by(Command.created_at)
    )
    commands = result.scalars().all()

    # Marquer comme SENT
    now = datetime.now(timezone.utc)
    for cmd in commands:
        cmd.status = "SENT"
        cmd.sent_at = now
    await db.flush()

    return commands


@router.post("/api/esp/commands/{command_id}/ack")
async def ack_command(
    command_id: uuid.UUID,
    body: CommandAck,
    device: Device = Depends(get_device_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Command).where(Command.id == command_id, Command.device_id == device.id)
    )
    command = result.scalar_one_or_none()
    if command is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable")

    command.status = body.status
    command.ack_at = datetime.now(timezone.utc)
    await db.flush()
    return {"status": "ok"}


# --- Frontend → Backend : envoyer une commande ---

@router.post(
    "/api/devices/{device_id}/commands",
    response_model=CommandOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_command(
    device_id: uuid.UUID,
    body: CommandCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Vérifier que le device appartient à l'utilisateur
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device introuvable")

    command = Command(device_id=device_id, action=body.action, params=body.params)
    db.add(command)
    await db.flush()
    return command
