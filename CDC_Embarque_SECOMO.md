# Cahier des Charges Embarqué — SECOMO (Serre Connectée Modulaire)

**Version** : 1.0
**Date** : 2026-02-11
**Responsable** : Arthur (Polytech Marseille, Informatique)

---

## 1. Introduction

### 1.1 Objectif
Le sous-système embarqué du projet SECOMO assure la collecte des données environnementales de la serre, le pilotage des actionneurs (arrosage, ventilation, éclairage), et la communication avec le backend FastAPI. Il fonctionne sur un microcontrôleur ESP32.

### 1.2 Périmètre
Ce document couvre :
- La lecture des capteurs (humidité sol, température, humidité air, pression, luminosité, niveau d'eau, pH)
- Le pilotage des actionneurs via un module relais 8 canaux
- La communication HTTP avec le backend
- La logique d'automatisation locale embarquée
- Les cas d'erreur et modes dégradés

---

## 2. Spécifications fonctionnelles

### 2.1 Lecture des capteurs

| # | Capteur | Grandeur mesurée | Protocole | Librairie | Fréquence de lecture |
|---|---------|-----------------|-----------|-----------|---------------------|
| 1 | Capteur humidité sol capacitif x2 | Humidité du sol (%) | Analogique (ADC) | analogRead natif | Toutes les 30 s |
| 2 | BME280 | Température (°C), Humidité air (%), Pression (hPa) | I2C | Adafruit BME280 | Toutes les 30 s |
| 3 | BH1750 | Luminosité (lux) | I2C | BH1750 | Toutes les 30 s |
| 4 | HC-SR04 | Niveau d'eau (cm) | Digital (trigger/echo) | NewPing | Toutes les 30 s |
| 5 | PH4502C | pH de l'eau | Analogique (ADC) | analogRead + calibration linéaire | Toutes les 60 s |

**Traitement des données capteurs** :
- **Humidité sol** : conversion de la valeur ADC brute (0–4095) en pourcentage via calibration (sec = 4095, mouillé = ~1500). Moyenne glissante sur 5 lectures pour filtrer le bruit.
- **BME280** : lecture directe via librairie Adafruit. Vérification que les valeurs sont dans des plages réalistes (T : -10 à 60 °C, H : 0 à 100 %, P : 800 à 1200 hPa).
- **BH1750** : lecture directe en lux. Plage attendue : 0 à 65535 lux.
- **HC-SR04** : mesure de distance en cm. Conversion en niveau d'eau par rapport à la hauteur du réservoir (paramétrable). Plage : 2 à 400 cm.
- **PH4502C** : conversion ADC → tension → pH par calibration linéaire deux points (pH 4.0 et pH 7.0). Plage attendue : 0 à 14.

### 2.2 Pilotage des actionneurs

Tous les actionneurs sont pilotés via un module relais 8 canaux (logique active LOW).

| # | Actionneur | Description | Relais | Sécurité |
|---|-----------|-------------|--------|----------|
| 1 | Pompe immergée 12V | Pompe principale d'arrosage | Relais 1 | Durée max 120 s, interdit si niveau eau bas |
| 2 | Pompe péristaltique 12V | Dosage nutriments/pH | Relais 2 | Durée max 30 s |
| 3 | Électrovanne A | Circuit arrosage principal | Relais 3 | Liée à la pompe principale |
| 4 | Électrovanne B | Sécurité / circuit secondaire | Relais 4 | Normalement fermée |
| 5 | Ventilateur 12V | Ventilation de la serre | Relais 5 | Durée max 1800 s |
| 6 | LED horticole | Éclairage horticole | Relais 6 | Pas de limite |
| 7 | Réserve | — | Relais 7 | — |
| 8 | Réserve | — | Relais 8 | — |

**Règles de sécurité actionneurs** :
- Chaque actionneur a une durée maximale d'activation (watchdog logiciel).
- La pompe principale ne peut s'activer que si le niveau d'eau est supérieur au seuil critique.
- L'électrovanne A s'ouvre toujours avant le démarrage de la pompe et se ferme après son arrêt.
- Un délai anti-rebond de 30 minutes minimum entre deux cycles d'arrosage.

### 2.3 Communication avec le backend

L'ESP32 agit en **client HTTP** et communique avec le backend FastAPI.

| Opération | Méthode | Endpoint | Fréquence | Description |
|-----------|---------|----------|-----------|-------------|
| Envoi données capteurs | POST | `/api/sensor-data` | Toutes les 5 min | Envoi du JSON de relevés |
| Récupération commandes | GET | `/api/commands` | Toutes les 5 min (après le POST) | Récupération des commandes en attente |

**Connexion WiFi** :
- SSID et mot de passe configurables dans `config.h`
- Reconnexion automatique en cas de perte de connexion (tentative toutes les 30 s)
- LED de statut : clignotement rapide = connexion en cours, fixe = connecté, éteinte = mode dégradé

### 2.4 Automatisation locale

L'ESP32 embarque une logique d'automatisation qui fonctionne **indépendamment du backend** :

| Règle | Condition | Action | Paramètres |
|-------|-----------|--------|------------|
| Arrosage auto | `soil_moisture < seuil_min` | Ouvrir vanne A + pompe pendant X secondes | `seuil_min` = 40%, `durée` = 30 s |
| Alerte niveau eau | `water_level < seuil_critique` | Bloquer arrosage + alerter backend | `seuil_critique` = 5 cm |
| Ventilation auto | `temperature > seuil_max` | Activer ventilateur | `seuil_max` = 30 °C |
| Anti-rebond arrosage | Dernier arrosage < 30 min | Bloquer nouvel arrosage | `cooldown` = 1800 s |
| Mode dégradé | WiFi perdu > 2 min | Continuer automatisation locale | — |

---

## 3. Schéma de câblage — Assignation des pins ESP32

### 3.1 Bus I2C (partagé)
| Signal | Pin ESP32 | Périphériques |
|--------|-----------|---------------|
| SDA | GPIO 21 | BME280, BH1750 |
| SCL | GPIO 22 | BME280, BH1750 |

### 3.2 Entrées analogiques (capteurs)
| Capteur | Pin ESP32 | ADC |
|---------|-----------|-----|
| Humidité sol 1 | GPIO 34 | ADC1_CH6 |
| Humidité sol 2 | GPIO 35 | ADC1_CH7 |
| PH4502C | GPIO 32 | ADC1_CH4 |

### 3.3 Entrées/sorties digitales (HC-SR04)
| Signal | Pin ESP32 |
|--------|-----------|
| TRIG | GPIO 5 |
| ECHO | GPIO 18 |

### 3.4 Sorties digitales (relais)
| Relais | Actionneur | Pin ESP32 |
|--------|-----------|-----------|
| 1 | Pompe immergée | GPIO 13 |
| 2 | Pompe péristaltique | GPIO 12 |
| 3 | Électrovanne A | GPIO 14 |
| 4 | Électrovanne B | GPIO 27 |
| 5 | Ventilateur | GPIO 26 |
| 6 | LED horticole | GPIO 25 |
| 7 | Réserve | GPIO 33 |
| 8 | Réserve | GPIO 15 |

### 3.5 Vérification des conflits de pins
- GPIO 34, 35 : entrées uniquement (ADC1, pas de pull-up interne) — OK pour capteurs analogiques
- GPIO 32 : ADC1 — OK pour pH
- GPIO 12 : attention au boot (doit être LOW au démarrage) — OK si relais actif LOW
- GPIO 15 : affecte les messages de debug UART au boot — acceptable pour relais réserve
- GPIO 5, 18, 21, 22 : pas de conflit identifié
- GPIO 13, 14, 25, 26, 27, 33 : pas de conflit identifié

---

## 4. Format des données JSON

### 4.1 Données capteurs envoyées (POST /api/sensor-data)
```json
{
  "device_id": "secomo-001",
  "timestamp": 1706000000,
  "sensors": {
    "soil_moisture_1": 45.2,
    "soil_moisture_2": 52.1,
    "temperature": 23.5,
    "humidity": 65.0,
    "pressure": 1013.25,
    "light_lux": 850,
    "water_level_cm": 15.3,
    "ph": 6.8
  },
  "actuators": {
    "pump_main": false,
    "pump_peristaltic": false,
    "valve_a": false,
    "valve_b": false,
    "fan": false,
    "led": true
  }
}
```

**Champs** :
- `device_id` : identifiant unique de l'ESP32 (configurable)
- `timestamp` : epoch UNIX (secondes), obtenu via NTP ou millis() si NTP indisponible
- `sensors` : relevés de tous les capteurs (valeurs flottantes)
- `actuators` : état actuel de chaque actionneur (true = actif, false = inactif)

### 4.2 Commandes reçues (GET /api/commands)
```json
{
  "commands": [
    {"action": "irrigate", "duration_sec": 30},
    {"action": "set_threshold", "param": "soil_moisture_min", "value": 40},
    {"action": "fan_on", "duration_sec": 300},
    {"action": "led_on"},
    {"action": "led_off"}
  ]
}
```

**Actions supportées** :
| Action | Paramètres | Description |
|--------|-----------|-------------|
| `irrigate` | `duration_sec` | Lancer un cycle d'arrosage |
| `set_threshold` | `param`, `value` | Modifier un seuil d'automatisation |
| `fan_on` | `duration_sec` (optionnel) | Activer le ventilateur |
| `fan_off` | — | Éteindre le ventilateur |
| `led_on` | — | Allumer la LED horticole |
| `led_off` | — | Éteindre la LED horticole |
| `pump_peristaltic_on` | `duration_sec` | Activer la pompe péristaltique |
| `reboot` | — | Redémarrer l'ESP32 |

---

## 5. Protocole de communication HTTP

### 5.1 Cycle de communication (toutes les 5 minutes)
1. Vérifier la connexion WiFi (reconnecter si nécessaire)
2. Envoyer les données capteurs via `POST /api/sensor-data`
3. Récupérer les commandes via `GET /api/commands`
4. Exécuter les commandes reçues
5. Attendre le prochain cycle

### 5.2 Headers HTTP
```
Content-Type: application/json
X-Device-ID: secomo-001
```

### 5.3 Codes de réponse attendus
| Code | Signification | Action ESP32 |
|------|--------------|--------------|
| 200 | Succès | Continuer normalement |
| 204 | Pas de commandes | Rien à faire |
| 400 | Données invalides | Logger l'erreur, renvoyer au prochain cycle |
| 500 | Erreur serveur | Ignorer, réessayer au prochain cycle |
| Timeout | Pas de réponse | Passer en mode dégradé si persistant |

### 5.4 Timeout et retry
- Timeout HTTP : 10 secondes
- Pas de retry immédiat (attente du prochain cycle de 5 min)
- Après 3 échecs consécutifs : passage en mode dégradé

---

## 6. Diagramme d'états du système

```
                    ┌──────────────┐
                    │  BOOT /      │
                    │  INIT        │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  CONNEXION   │◄────────────────────┐
                    │  WIFI        │                      │
                    └──────┬───────┘                      │
                           │                              │
              ┌────────────▼────────────┐                 │
              │                         │                 │
     ┌────────▼────────┐    ┌──────────▼──────────┐      │
     │  MODE CONNECTÉ  │    │  MODE DÉGRADÉ       │      │
     │  (nominal)      │    │  (WiFi perdu)       │      │
     └────────┬────────┘    └──────────┬──────────┘      │
              │                        │                  │
              │    ┌───────────────────┐│                  │
              └────►  LECTURE CAPTEURS ◄┘                  │
                   └───────┬──────────┘                    │
                           │                               │
                   ┌───────▼──────────┐                    │
                   │  AUTOMATISATION  │                    │
                   │  LOCALE          │                    │
                   └───────┬──────────┘                    │
                           │                               │
              ┌────────────▼────────────┐                  │
              │  Si connecté :          │                  │
              │  ENVOI DONNÉES +        │──── échec ───────┘
              │  RÉCEPTION COMMANDES    │
              └────────────┬────────────┘
                           │
                   ┌───────▼──────────┐
                   │  EXÉCUTION       │
                   │  COMMANDES       │
                   └───────┬──────────┘
                           │
                   ┌───────▼──────────┐
                   │  ATTENTE         │
                   │  (5 min)         │
                   └───────┬──────────┘
                           │
                           └──── retour à LECTURE CAPTEURS
```

### 6.1 Description des états

| État | Description | Transition |
|------|-------------|-----------|
| BOOT/INIT | Initialisation des capteurs, relais, Serial | → CONNEXION WIFI |
| CONNEXION WIFI | Tentative de connexion au réseau | Succès → MODE CONNECTÉ / Échec → MODE DÉGRADÉ |
| MODE CONNECTÉ | Fonctionnement nominal avec communication backend | Perte WiFi → MODE DÉGRADÉ |
| MODE DÉGRADÉ | Automatisation locale seule, pas de communication | WiFi retrouvé → MODE CONNECTÉ |
| LECTURE CAPTEURS | Lecture de tous les capteurs | → AUTOMATISATION LOCALE |
| AUTOMATISATION LOCALE | Évaluation des règles d'arrosage/ventilation | → ENVOI DONNÉES ou ATTENTE |
| ENVOI DONNÉES | POST des données + GET des commandes | Échec → MODE DÉGRADÉ |
| EXÉCUTION COMMANDES | Traitement des commandes reçues du backend | → ATTENTE |
| ATTENTE | Pause de 5 minutes avant le prochain cycle | → LECTURE CAPTEURS |

---

## 7. Cas d'erreur et comportements de repli

### 7.1 Erreurs capteurs

| Erreur | Détection | Comportement |
|--------|-----------|-------------|
| BME280 non détecté | `begin()` retourne false | Valeurs à -1, log erreur, continuer sans |
| BH1750 non détecté | `begin()` retourne false | Luminosité à -1, continuer sans |
| HC-SR04 timeout | Lecture retourne 0 | Niveau d'eau à -1, bloquer arrosage par sécurité |
| Humidité sol hors plage | Valeur ADC = 0 ou 4095 | Valeur à -1, ne pas déclencher d'arrosage auto |
| pH hors plage | pH < 0 ou pH > 14 | Valeur à -1, log erreur |

### 7.2 Erreurs réseau

| Erreur | Détection | Comportement |
|--------|-----------|-------------|
| WiFi déconnecté | `WiFi.status() != WL_CONNECTED` | Tentative reconnexion toutes les 30 s |
| POST échoue | Code HTTP != 200 | Compter l'échec, réessayer au prochain cycle |
| GET échoue | Code HTTP != 200 | Ignorer, pas de commandes à traiter |
| 3 échecs consécutifs | Compteur d'échecs | Passage officiel en mode dégradé |
| JSON invalide reçu | Erreur de parsing ArduinoJson | Ignorer la réponse, log erreur |

### 7.3 Erreurs actionneurs

| Erreur | Détection | Comportement |
|--------|-----------|-------------|
| Pompe bloquée en ON | Watchdog logiciel (durée max) | Forcer l'arrêt après durée maximale |
| Niveau eau critique | HC-SR04 < seuil | Interdire activation pompe principale |
| Surchauffe potentielle | Impossible à détecter directement | Limite de temps sur ventilateur |

### 7.4 Mode dégradé

En mode dégradé (WiFi perdu), l'ESP32 :
- Continue la lecture des capteurs normalement
- Continue l'automatisation locale (arrosage, ventilation)
- Tente de se reconnecter au WiFi toutes les 30 secondes
- Ne perd pas les seuils configurés (stockés en RAM, valeurs par défaut dans config.h)
- Reprend la communication dès que le WiFi est retrouvé

---

## 8. Environnement de développement

### 8.1 Outils
- **IDE** : Visual Studio Code + extension PlatformIO
- **Framework** : Arduino pour ESP32
- **Carte** : ESP32 DevKit v1 (ESP-WROOM-32)

### 8.2 Librairies utilisées
| Librairie | Version | Usage |
|-----------|---------|-------|
| Adafruit BME280 Library | ^2.2.2 | Capteur température/humidité/pression |
| Adafruit Unified Sensor | ^1.1.9 | Dépendance Adafruit BME280 |
| BH1750 | ^1.3.0 | Capteur de luminosité |
| NewPing | ^1.9.7 | Capteur ultrason HC-SR04 |
| ArduinoJson | ^7.0.0 | Sérialisation/désérialisation JSON |
| WiFi | intégrée | Connexion WiFi ESP32 |
| HTTPClient | intégrée | Requêtes HTTP |
| Wire | intégrée | Communication I2C |

### 8.3 Structure du projet
```
SECOMO_ESP32/
├── platformio.ini
├── src/
│   ├── main.cpp
│   ├── config.h
│   ├── sensors.h / .cpp
│   ├── actuators.h / .cpp
│   ├── network.h / .cpp
│   └── automation.h / .cpp
└── README.md
```

---

## 9. Tests et validation

### 9.1 Tests unitaires (sur matériel)
- Vérifier la lecture de chaque capteur individuellement
- Vérifier l'activation/désactivation de chaque relais
- Vérifier la connexion WiFi et l'envoi HTTP
- Vérifier le parsing des commandes JSON

### 9.2 Tests d'intégration
- Cycle complet : lecture → automatisation → envoi → réception commandes
- Test du mode dégradé : déconnecter le WiFi, vérifier que l'arrosage fonctionne
- Test anti-rebond : vérifier qu'un arrosage ne se déclenche pas deux fois en 30 min
- Test watchdog : vérifier l'arrêt automatique de la pompe après durée max

### 9.3 Critères d'acceptation
- [ ] Tous les capteurs retournent des valeurs cohérentes
- [ ] Les actionneurs s'activent et se désactivent correctement
- [ ] Les données JSON sont envoyées au backend et acceptées
- [ ] Les commandes du backend sont reçues et exécutées
- [ ] L'arrosage automatique fonctionne sans backend
- [ ] Le mode dégradé est fonctionnel
- [ ] Aucun conflit de pins
- [ ] Le système tourne de manière stable sur 24 h
