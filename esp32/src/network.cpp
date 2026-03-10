#include "network.h"
#include "config.h"
#include "automation.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

static int httpFailureCount = 0;

// ============================================================
// Initialisation
// ============================================================

void networkInit() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    Serial.println("[NETWORK] WiFi initialisé en mode station");
}

// ============================================================
// Connexion WiFi
// ============================================================

bool networkConnect() {
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    Serial.printf("[NETWORK] Connexion à %s...\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Attendre la connexion (max 10 secondes)
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[NETWORK] Connecté ! IP : %s\n", WiFi.localIP().toString().c_str());
        httpFailureCount = 0;
        return true;
    } else {
        Serial.println("[NETWORK] Échec de connexion WiFi");
        return false;
    }
}

bool networkIsConnected() {
    return WiFi.status() == WL_CONNECTED;
}

// ============================================================
// Envoi des données capteurs
// ============================================================

bool networkSendSensorData(const SensorData& sensors, const ActuatorState& actuators) {
    if (!networkIsConnected()) {
        Serial.println("[NETWORK] Pas de WiFi, envoi impossible");
        httpFailureCount++;
        return false;
    }

    HTTPClient http;
    String url = String(BACKEND_URL) + ENDPOINT_SENSOR;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-ID", DEVICE_ID);
    http.setTimeout(HTTP_TIMEOUT_MS);

    // Construire le JSON
    JsonDocument doc;
    // Timestamp ISO 8601 via NTP (ou uptime si non synchronisé)
    struct tm timeinfo;
    char tsBuf[32];
    if (getLocalTime(&timeinfo)) {
        strftime(tsBuf, sizeof(tsBuf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    } else {
        snprintf(tsBuf, sizeof(tsBuf), "uptime:%lu", millis() / 1000);
    }

    doc["device_id"] = DEVICE_ID;
    doc["plant_id"] = PLANT_ID;
    doc["timestamp"] = tsBuf;

    // Calculer la moyenne humidité sol
    float soilAvg = -1.0;
    if (sensors.soilMoisture1 >= 0 && sensors.soilMoisture2 >= 0) {
        soilAvg = (sensors.soilMoisture1 + sensors.soilMoisture2) / 2.0;
    } else if (sensors.soilMoisture1 >= 0) {
        soilAvg = sensors.soilMoisture1;
    } else if (sensors.soilMoisture2 >= 0) {
        soilAvg = sensors.soilMoisture2;
    }

    JsonObject sensorsObj = doc["sensors"].to<JsonObject>();
    sensorsObj["soil_moisture_1"] = sensors.soilMoisture1;
    sensorsObj["soil_moisture_2"] = sensors.soilMoisture2;
    if (soilAvg >= 0) {
        sensorsObj["soil_moisture"] = soilAvg;
    }
    sensorsObj["temperature"] = sensors.temperature;
    sensorsObj["humidity"] = sensors.humidity;
    sensorsObj["pressure"] = sensors.pressure;
    sensorsObj["light_lux"] = sensors.lightLux;
    sensorsObj["water_level_cm"] = sensors.waterLevelCm;
    sensorsObj["ph"] = sensors.ph;

    JsonObject actuatorsObj = doc["actuators"].to<JsonObject>();
    actuatorsObj["pump_main"] = actuators.pumpMain;
    actuatorsObj["pump_peristaltic"] = actuators.pumpPeristaltic;
    actuatorsObj["valve_a"] = actuators.valveA;
    actuatorsObj["valve_b"] = actuators.valveB;
    actuatorsObj["fan"] = actuators.fan;
    actuatorsObj["led"] = actuators.led;

    doc["automation_enabled"] = automationIsEnabled();

    String payload;
    serializeJson(doc, payload);

    Serial.printf("[NETWORK] POST %s (%d octets)\n", url.c_str(), payload.length());

    int httpCode = http.POST(payload);

    if (httpCode == 200) {
        Serial.println("[NETWORK] Données envoyées avec succès");
        httpFailureCount = 0;
        http.end();
        return true;
    } else {
        Serial.printf("[NETWORK] Erreur POST : %d\n", httpCode);
        httpFailureCount++;
        http.end();
        return false;
    }
}

// ============================================================
// Récupération des commandes
// ============================================================

bool networkFetchCommands(String& commandsJson) {
    if (!networkIsConnected()) {
        return false;
    }

    HTTPClient http;
    String url = String(BACKEND_URL) + ENDPOINT_COMMANDS;
    http.begin(url);
    http.addHeader("X-Device-ID", DEVICE_ID);
    http.setTimeout(HTTP_TIMEOUT_MS);

    Serial.printf("[NETWORK] GET %s\n", url.c_str());

    int httpCode = http.GET();

    if (httpCode == 200) {
        commandsJson = http.getString();
        Serial.printf("[NETWORK] Commandes reçues (%d octets)\n", commandsJson.length());
        http.end();
        return true;
    } else if (httpCode == 204) {
        Serial.println("[NETWORK] Pas de commandes en attente");
        http.end();
        return false;
    } else {
        Serial.printf("[NETWORK] Erreur GET commandes : %d\n", httpCode);
        http.end();
        return false;
    }
}

// ============================================================
// Compteur d'échecs
// ============================================================

int networkGetFailureCount() {
    return httpFailureCount;
}

void networkResetFailureCount() {
    httpFailureCount = 0;
}
