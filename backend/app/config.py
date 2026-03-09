import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

JWT_SECRET = os.getenv("JWT_SECRET")

TREFLE_TOKEN = os.getenv("TREFLE_TOKEN")

#PERENUAL_API = os.getenv("PERENUAL_API")

OPENWEATHER_API = os.getenv("OPENWEATHER_API")