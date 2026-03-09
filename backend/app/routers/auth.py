from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from jose import jwt
from app.database import SessionLocal
from app.models.user import User
from app.config import JWT_SECRET

router = APIRouter()

@router.post("/register")
def register(email: str, password: str):

    db = SessionLocal()

    user = User(
        email=email,
        password_hash=bcrypt.hash(password)
    )

    db.add(user)
    db.commit()

    return {"message": "user created"}