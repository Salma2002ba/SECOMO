# SECOMO - Serre Connectée Modulaire

Système complet de gestion de serre connectée : capteurs environnementaux, pilotage d'actionneurs, dashboard temps réel.

## Architecture

```
Partie_Arthur/
├── esp32/       # Firmware embarqué (ESP32, PlatformIO/Arduino)
├── backend/     # API REST (FastAPI async, PostgreSQL)
└── frontend/    # Interface web (React 19, TypeScript, Vite)
```

---

## 1. Backend

### Prérequis
- Python 3.11+
- Docker (pour PostgreSQL)

### Installation

```bash
cd backend

# Lancer la base de données PostgreSQL
docker-compose up -d

# Créer un environnement virtuel et installer les dépendances
python -m venv venv
source venv/bin/activate        # Linux/Mac
# ou : venv\Scripts\activate    # Windows

pip install -r requirements.txt
```

### Configuration

Créer un fichier `backend/.env` (optionnel, des valeurs par défaut existent) :

```env
DATABASE_URL=postgresql+asyncpg://secomo:secomo@localhost:5432/secomo
SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32
CORS_ORIGINS=["http://localhost:3000"]
```

### Lancement

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API est accessible sur `http://localhost:8000`.
Documentation Swagger : `http://localhost:8000/docs`.

---

## 2. Frontend

### Prérequis
- Node.js 18+

### Installation et lancement

```bash
cd frontend
npm install
npm run dev
```

L'interface est accessible sur `http://localhost:3000`.

### Build de production

```bash
npm run build
npm run preview
```

---

## 3. ESP32 (Firmware embarqué)

### Prérequis
- [PlatformIO](https://platformio.org/) (extension VS Code ou CLI)
- Carte ESP32 DevKit v1

### Configuration

Avant de flasher, modifier `esp32/src/config.h` :

```cpp
// WiFi
#define WIFI_SSID     "VOTRE_SSID"
#define WIFI_PASSWORD  "VOTRE_MOT_DE_PASSE"

// Adresse IP du serveur backend
#define BACKEND_URL   "http://192.168.1.100:8000"
```

### Flash et monitoring

```bash
cd esp32
pio run --target upload      # Compiler et flasher
pio device monitor           # Moniteur série (115200 baud)
```

### Capteurs connectés

| Capteur | Mesure | Pins |
|---------|--------|------|
| BME280 | Temp, humidité air, pression | I2C (GPIO 21/22) |
| BH1750 | Luminosité (lux) | I2C (GPIO 21/22) |
| Capteur humidité sol x2 | Humidité sol (%) | GPIO 34, 35 |
| HC-SR04 | Niveau d'eau (cm) | GPIO 5 (trig), 18 (echo) |
| PH4502C | pH de l'eau | GPIO 32 |

### Actionneurs (relais 8 canaux)

| Relais | Actionneur | Pin |
|--------|-----------|-----|
| 1 | Pompe immergée | GPIO 13 |
| 2 | Pompe péristaltique | GPIO 12 |
| 3 | Electrovanne A | GPIO 14 |
| 4 | Electrovanne B | GPIO 27 |
| 5 | Ventilateur | GPIO 26 |
| 6 | LED horticole | GPIO 25 |

---

## Ordre de lancement

1. `docker-compose up -d` (dans `backend/`) - Base de données
2. `uvicorn app.main:app --reload` (dans `backend/`) - API
3. `npm run dev` (dans `frontend/`) - Interface web
4. Flasher l'ESP32 avec le bon `config.h` - Capteurs/actionneurs
