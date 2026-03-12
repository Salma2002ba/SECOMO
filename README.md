# SECOMO — Serre Connectée Modulaire

Système de monitoring et de pilotage de serre connectée, conçu dans le cadre d'un projet inter-école.
Il repose sur trois composants : un firmware ESP32 qui lit les capteurs et pilote les actionneurs, une API REST FastAPI qui centralise les données, et un dashboard web React pour visualiser et contrôler l'ensemble en temps réel.

---

## Sommaire

- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
  - [1. Backend](#1-backend)
  - [2. Frontend](#2-frontend)
  - [3. ESP32](#3-esp32)
- [Ordre de lancement](#ordre-de-lancement)
- [Connexion ESP32 ↔ Backend](#connexion-esp32--backend)
- [Branchements matériels](#branchements-matériels)
- [Dépannage](#dépannage)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Serre physique                       │
│                                                             │
│  ┌──────────────┐   HTTP JSON    ┌──────────────────────┐   │
│  │    ESP32     │ ─────────────► │   Backend FastAPI    │   │
│  │  Firmware    │ ◄───────────── │   PostgreSQL         │   │
│  │  PlatformIO  │  commandes     │   port 8000          │   │
│  └──────────────┘                └──────────┬───────────┘   │
│                                             │ WebSocket      │
│                                             ▼               │
│                                  ┌──────────────────────┐   │
│                                  │   Dashboard React    │   │
│                                  │   port 3000          │   │
│                                  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

```
Partie_Arthur/
├── backend/      # API REST (FastAPI + PostgreSQL)
├── frontend/     # Interface web (React 19 + TypeScript + Vite)
└── esp32/        # Firmware embarqué (ESP32 DevKit v1, PlatformIO)
```

---

## Fonctionnalités

**Dashboard**
- Affichage en temps réel des capteurs (température, humidité air, humidité sol, luminosité, pH, niveau d'eau, batterie)
- Graphiques historiques par plage de temps
- Alertes automatiques quand un seuil est dépassé
- Arrosage manuel et automatique avec historique

**Gestion des plantes**
- Profils de plantes avec seuils personnalisables (humidité, température, lumière, pH)
- Catalogue de plantes par défaut inclus

**Contrôle des actionneurs**
- Commandes depuis le dashboard : pompe, ventilateur, électrovanne, LED horticole
- L'ESP32 poll les commandes toutes les 30 secondes et accuse réception

**Système multi-appareils**
- Plusieurs ESP32 peuvent coexister sous un même compte
- Organisation en stations et grilles de bacs

**Interface**
- Bilingue français / anglais
- Thème clair / sombre
- Responsive mobile

---

## Prérequis

| Composant | Outil requis |
|-----------|-------------|
| Backend | Python 3.11+, Docker |
| Frontend | Node.js 18+ |
| ESP32 | PlatformIO (extension VS Code ou CLI) |

---

## Installation

### 1. Backend

```bash
cd backend
```

**Lancer PostgreSQL via Docker**

```bash
docker-compose up -d
```

Cela démarre un conteneur PostgreSQL sur le port 5432 avec les identifiants `secomo / secomo`.

**Créer l'environnement virtuel et installer les dépendances**

```bash
python -m venv venv

# Linux / macOS
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

**Configuration (optionnelle)**

Par défaut, le backend fonctionne sans fichier `.env`. Pour surcharger les valeurs :

```env
# backend/.env
DATABASE_URL=postgresql+asyncpg://secomo:secomo@localhost:5432/secomo
SECRET_KEY=remplacer-par-une-vraie-cle-secrete
CORS_ORIGINS=["http://localhost:3000"]
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

**Lancer le serveur**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API : `http://localhost:8000`
- Documentation Swagger : `http://localhost:8000/docs`

Au premier démarrage, la base de données est créée automatiquement et le catalogue de plantes est injecté.

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface est accessible sur `http://localhost:3000`.

**Build de production**

```bash
npm run build
npm run preview
```

---

### 3. ESP32

**Prérequis matériel** : ESP32 DevKit v1, câble USB, capteurs connectés (voir [Branchements matériels](#branchements-matériels)).

**Configurer les paramètres réseau**

Ouvrir `esp32/src/config.h` et renseigner :

```cpp
// Réseau WiFi
#define WIFI_SSID     "NOM_DU_RESEAU"
#define WIFI_PASSWORD "MOT_DE_PASSE"

// Adresse IP de la machine qui fait tourner le backend
#define BACKEND_URL   "http://192.168.1.100:8000"

// Clé API générée depuis le dashboard (voir section ci-dessous)
#define API_KEY       "votre_cle_api_ici"
```

> L'ESP32 et le backend doivent être sur le même réseau. Si vous utilisez un hotspot mobile, vérifiez que l'IP est bien celle attribuée par ce hotspot.

**Compiler et flasher**

```bash
cd esp32
pio run --target upload
```

**Moniteur série**

```bash
pio device monitor   # 115200 baud
```

---

## Ordre de lancement

Respecter cet ordre pour éviter les erreurs de connexion :

```
1. docker-compose up -d          # dans backend/   → Base de données
2. uvicorn app.main:app ...      # dans backend/   → API REST
3. npm run dev                   # dans frontend/  → Dashboard
4. (flasher l'ESP32)             # une seule fois tant que le firmware ne change pas
```

---

## Connexion ESP32 ↔ Backend

L'ESP32 s'authentifie auprès du backend avec une clé API. Voici comment l'obtenir :

1. Créer un compte sur le dashboard (`http://localhost:3000`)
2. Aller dans **Appareils** → **Ajouter un appareil**
3. Copier la clé API générée
4. La coller dans `esp32/src/config.h` à la ligne `#define API_KEY`
5. Reflasher l'ESP32

L'ESP32 envoie ses données toutes les 10 secondes (mode test) ou 5 minutes (mode production) via :

```
POST /api/esp/readings
Authorization: X-API-Key <votre_cle>

{
  "temp_air": 24.5,
  "humidity_air": 65.0,
  "humidity_soil": 45.2,
  "light": 75.0,
  "soil_ph": 6.8,
  "water_tank_level": 85.0,
  "battery_level": 92.0
}
```

Pour passer en mode production (intervalles réels), décommenter les lignes correspondantes dans `config.h` :

```cpp
// #define SENSOR_READ_INTERVAL_MS 30000
// #define SEND_INTERVAL_MS        300000
```

---

## Branchements matériels

### Capteurs

| Capteur | Mesure | Interface | Broche(s) |
|---------|--------|-----------|-----------|
| BME280 | Température air, humidité air, pression | I2C (0x76 ou 0x77) | SDA → GPIO 21, SCL → GPIO 22 |
| BH1750 | Luminosité (lux) | I2C (0x23 ou 0x5C) | SDA → GPIO 21, SCL → GPIO 22 |
| Capteur sol capacitif | Humidité sol (%) | Analogique | GPIO 32 |
| HC-SR04 | Niveau eau dans le réservoir (cm) | Digital | Trig → GPIO 5, Echo → GPIO 18 |
| PH4502C | pH solution | Analogique | GPIO 33 |
| Pont diviseur 100k+100k | Niveau batterie LiPo | Analogique | GPIO 36 |

> Le BH1750 accepte deux adresses selon la broche ADDR : reliée à GND → 0x23, reliée à VCC → 0x5C.

> Le BME280 accepte l'adresse 0x76 (broche SDO à GND) ou 0x77 (SDO à VCC).

### Actionneurs (module relais 8 canaux)

| Broche | Actionneur | Tension |
|--------|-----------|---------|
| GPIO 26 | Pompe immergée principale | 3.3V |
| GPIO 27 | Pompe péristaltique | 12V |
| GPIO 14 | Ventilateur | 12V |
| GPIO 12 | Électrovanne A | 12V |
| GPIO 13 | LED horticole | — |
| GPIO 25 | Électrovanne B (réserve) | 12V |

---

## Dépannage

**L'ESP32 ne se connecte pas au WiFi**
- Vérifier le SSID et mot de passe dans `config.h`
- S'assurer que le réseau est en 2.4 GHz (l'ESP32 ne supporte pas le 5 GHz)
- Si hotspot mobile : vérifier que la connexion USB n'interfère pas avec le partage

**Le backend ne reçoit pas de données (HTTP 401)**
- La clé API dans `config.h` ne correspond pas à celle enregistrée en base
- Régénérer la clé depuis le dashboard et reflasher

**Le backend ne reçoit pas de données (connexion refusée)**
- Vérifier que `BACKEND_URL` pointe bien vers l'IP de la machine hôte (pas `localhost`)
- Vérifier que le port 8000 est autorisé dans le pare-feu Windows :
  ```
  netsh advfirewall firewall add rule name="SECOMO" dir=in action=allow protocol=TCP localport=8000
  ```

**Le conteneur PostgreSQL ne démarre pas**
- Vérifier que Docker Desktop est lancé
- `docker ps` pour voir l'état du conteneur
- `docker-compose logs` pour lire les erreurs

**Capteur BME280 non détecté**
- Vérifier l'adresse I2C avec un scanner : lancer le sketch `i2c_scanner` dans Arduino IDE
- L'adresse doit être 0x76 ou 0x77 selon la broche SDO

**Surveiller les données reçues en direct**

```bash
# PowerShell (Windows)
Get-Content backend\esp32_data.log -Wait -Tail 10

# Linux / macOS
tail -f backend/esp32_data.log
```
