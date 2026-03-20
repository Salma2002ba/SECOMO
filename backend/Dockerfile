FROM python:3.12-slim

WORKDIR /backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

EXPOSE 8000

# Start the FastAPI app (Render/Fly/Railway will set $PORT when needed)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

