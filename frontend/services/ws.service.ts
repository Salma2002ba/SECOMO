type EventType = 'sensor_reading' | 'alert' | 'watering_status' | 'device_status';
type Listener = (data: any, deviceId: string) => void;

// Dépend de l'environnement (prod sur HTTPS -> wss://...)
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

class WSService {
  private ws: WebSocket | null = null;
  private listeners: Map<EventType, Listener[]> = new Map();
  private token: string | null = null;
  private shouldReconnect = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this._connect();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(type: EventType, callback: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  off(type: EventType, callback: Listener) {
    const list = this.listeners.get(type);
    if (list) {
      this.listeners.set(type, list.filter(fn => fn !== callback));
    }
  }

  private _connect() {
    if (!this.token) return;

    this.ws = new WebSocket(`${WS_BASE}/api/ws?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('[WS] Connecté');
      // Ping keepalive
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, PING_INTERVAL);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;
        const callbacks = this.listeners.get(msg.type as EventType);
        if (callbacks) {
          callbacks.forEach(fn => fn(msg.data, msg.device_id));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Déconnecté');
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.shouldReconnect) {
        setTimeout(() => this._connect(), RECONNECT_DELAY);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }
}

export const wsService = new WSService();
