#include <Arduino.h>
#include <ArduinoJson.h>
#include <time.h>

#include "config.h"
#include "sensors.h"
#include "actuators.h"
#include "network.h"
#include "automation.h"

// --- Timers ---
static unsigned long lastSensorReadMs = 0;
static unsigned long lastSendMs = 0;
static unsigned long lastCommandPollMs = 0;
static unsigned long lastWifiAttemptMs = 0;
static bool ntpSynced = false;

// --- NTP : synchronisation de l'heure réelle ---
void syncNTP() {
    configTime(3600, 3600, "pool.ntp.org", "time.google.com"); // UTC+1 + heure été
    Serial.print("[NTP] Synchronisation...");
    int tries = 0;
    struct tm timeinfo;
    while (!getLocalTime(&timeinfo) && tries++ < 20) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();
    if (tries < 20) {
        ntpSynced = true;
        char buf[32];
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
        Serial.printf("[NTP] Heure synchronisée : %s\n", buf);
    } else {
        Serial.println("[NTP] Échec de synchronisation");
    }
}

// Retourne l'heure ISO 8601 courante (ou uptime si NTP non synchronisé)
String getTimestamp() {
    if (ntpSynced) {
        struct tm timeinfo;
        if (getLocalTime(&timeinfo)) {
            char buf[32];
            strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
            return String(buf);
        }
    }
    // Fallback : secondes depuis démarrage
    return String("uptime:") + String(millis() / 1000);
}

// --- Dernières données capteurs ---
static SensorData lastSensorData;

// --- Mode dégradé ---
static bool degradedMode = false;

// ============================================================
// Traitement des commandes reçues du backend
// ============================================================

void processCommands(const String& json) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, json);

    if (error) {
        Serial.printf("[MAIN] Erreur parsing JSON commandes : %s\n", error.c_str());
        return;
    }

    JsonArray commands = doc["commands"].as<JsonArray>();
    if (commands.isNull()) {
        Serial.println("[MAIN] Pas de tableau 'commands' dans le JSON");
        return;
    }

    for (JsonObject cmd : commands) {
        const char* action = cmd["action"];
        if (!action) continue;

        Serial.printf("[MAIN] Commande reçue : %s\n", action);

        if (strcmp(action, "irrigate") == 0) {
            int duration = cmd["duration_sec"] | IRRIGATION_DURATION_SEC;
            if (!automationIsIrrigationBlocked()) {
                automationStartIrrigation(duration);
            } else {
                Serial.println("[MAIN] Arrosage bloqué (cooldown ou eau basse)");
            }
        }
        else if (strcmp(action, "set_threshold") == 0) {
            const char* param = cmd["param"];
            float value = cmd["value"] | 0.0f;
            if (param) {
                automationSetThreshold(param, value);
            }
        }
        else if (strcmp(action, "fan_on") == 0) {
            fanOn();
        }
        else if (strcmp(action, "fan_off") == 0) {
            fanOff();
        }
        else if (strcmp(action, "led_on") == 0) {
            ledOn();
        }
        else if (strcmp(action, "led_off") == 0) {
            ledOff();
        }
        else if (strcmp(action, "pump_peristaltic_on") == 0) {
            pumpPeristalticOn();
            // Le watchdog coupera automatiquement après PERISTALTIC_MAX_DURATION_SEC
        }
        else if (strcmp(action, "cancel_irrigation") == 0) {
            automationCancelIrrigation();
        }
        else if (strcmp(action, "set_mode") == 0) {
            const char* mode = cmd["mode"] | "auto";
            automationSetEnabled(strcmp(mode, "auto") == 0);
        }
        else if (strcmp(action, "reboot") == 0) {
            Serial.println("[MAIN] Redémarrage demandé par le backend...");
            delay(1000);
            ESP.restart();
        }
        else {
            Serial.printf("[MAIN] Action inconnue : %s\n", action);
        }
    }
}

// ============================================================
// Setup
// ============================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=========================================");
    Serial.println("  SECOMO — Serre Connectée Modulaire");
    Serial.println("  ESP32 Firmware v1.0");
    Serial.println("=========================================");

    // LED de statut
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    // Initialisation des modules
    sensorsInit();
    actuatorsInit();
    automationInit();
    networkInit();

    // Tentative de connexion WiFi
    Serial.println("[MAIN] Connexion WiFi...");
    if (networkConnect()) {
        degradedMode = false;
        digitalWrite(PIN_STATUS_LED, HIGH); // LED fixe = connecté
        syncNTP(); // Synchronisation heure réseau
    } else {
        degradedMode = true;
        Serial.println("[MAIN] Mode dégradé activé (pas de WiFi)");
    }

    // Première lecture capteurs immédiate
    lastSensorData = sensorsRead();

    Serial.println("[MAIN] Initialisation terminée. Démarrage de la boucle principale.");
    Serial.println("=========================================");
}

// ============================================================
// Loop
// ============================================================

void loop() {
    unsigned long now = millis();

    // --- Watchdog actionneurs (à chaque itération) ---
    actuatorsWatchdog();

    // --- Lecture capteurs périodique ---
    if (now - lastSensorReadMs >= SENSOR_READ_INTERVAL_MS) {
        lastSensorReadMs = now;
        lastSensorData = sensorsRead();

        // Évaluer l'automatisation locale après chaque lecture
        automationEvaluate(lastSensorData);
    }

    // --- Vérification / rétablissement WiFi ---
    if (!networkIsConnected() && (now - lastWifiAttemptMs >= WIFI_RECONNECT_INTERVAL_MS)) {
        lastWifiAttemptMs = now;
        digitalWrite(PIN_STATUS_LED, LOW);

        if (networkConnect()) {
            degradedMode = false;
            networkResetFailureCount();
            digitalWrite(PIN_STATUS_LED, HIGH);
            Serial.println("[MAIN] WiFi rétabli, sortie du mode dégradé");
        } else if (!degradedMode) {
            degradedMode = true;
            Serial.println("[MAIN] Mode dégradé activé (WiFi déconnecté)");
        }
    }

    // --- Envoi des données capteurs (toutes les 5 min) ---
    if (now - lastSendMs >= SEND_INTERVAL_MS) {
        lastSendMs = now;

        if (networkIsConnected()) {
            ActuatorState actuatorState = actuatorsGetState();
            networkSendSensorData(lastSensorData, actuatorState);

            // Vérifier passage en mode dégradé
            if (networkGetFailureCount() >= MAX_HTTP_FAILURES && !degradedMode) {
                degradedMode = true;
                Serial.println("[MAIN] Mode dégradé activé (trop d'échecs HTTP)");
                digitalWrite(PIN_STATUS_LED, LOW);
            }
        }
    }

    // --- Récupération des commandes (toutes les 30 s) ---
    if (now - lastCommandPollMs >= COMMAND_POLL_INTERVAL_MS) {
        lastCommandPollMs = now;

        if (networkIsConnected()) {
            String commandsJson;
            if (networkFetchCommands(commandsJson)) {
                processCommands(commandsJson);
            }
        }
    }

    // --- Reconnexion WiFi en mode dégradé ---
    if (degradedMode && (now - lastWifiAttemptMs >= WIFI_RECONNECT_INTERVAL_MS)) {
        lastWifiAttemptMs = now;
        if (networkConnect()) {
            degradedMode = false;
            networkResetFailureCount();
            digitalWrite(PIN_STATUS_LED, HIGH);
            Serial.println("[MAIN] WiFi rétabli, sortie du mode dégradé");
        }
    }

    // Petite pause pour ne pas saturer le CPU
    delay(100);
}
