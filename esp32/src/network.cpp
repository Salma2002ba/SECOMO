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
    http.addHeader("X-Api-Key", API_KEY);
    http.setTimeout(HTTP_TIMEOUT_MS);

    // Construire le JSON au format attendu par SensorReadingIn
    JsonDocument doc;

    // temp_air (BME280)
    if (sensors.temperature >= 0) doc["temp_air"] = sensors.temperature;

    // humidity_air (BME280) et humidity_soil (moyenne capteurs sol)
    if (sensors.humidity >= 0) doc["humidity_air"] = sensors.humidity;

    float soilAvg = -1.0;
    if (sensors.soilMoisture1 >= 0 && sensors.soilMoisture2 >= 0) {
        soilAvg = (sensors.soilMoisture1 + sensors.soilMoisture2) / 2.0;
    } else if (sensors.soilMoisture1 >= 0) {
        soilAvg = sensors.soilMoisture1;
    } else if (sensors.soilMoisture2 >= 0) {
        soilAvg = sensors.soilMoisture2;
    }
    if (soilAvg >= 0) doc["humidity_soil"] = soilAvg;

    // light : lux → % (capé à LIGHT_MAX_LUX)
    if (sensors.lightLux >= 0) {
        float lightPct = (sensors.lightLux / LIGHT_MAX_LUX) * 100.0;
        if (lightPct > 100.0) lightPct = 100.0;
        doc["light"] = lightPct;
    }

    // soil_ph
    if (sensors.ph >= 0) doc["soil_ph"] = sensors.ph;

    // water_tank_level : cm → % (hauteur réservoir)
    if (sensors.waterLevelCm >= 0) {
        float tankPct = (sensors.waterLevelCm / TANK_HEIGHT_CM) * 100.0;
        if (tankPct > 100.0) tankPct = 100.0;
        doc["water_tank_level"] = tankPct;
    }

    // battery_level
    if (sensors.batteryLevel >= 0) doc["battery_level"] = sensors.batteryLevel;

    String payload;
    serializeJson(doc, payload);

    Serial.printf("[NETWORK] POST %s (%d octets)\n", url.c_str(), payload.length());
    Serial.println("[NETWORK] Payload : " + payload);

    int httpCode = http.POST(payload);

    if (httpCode == 201) {
        Serial.println("[NETWORK] Données envoyées avec succès (201)");
        httpFailureCount = 0;
        http.end();
        return true;
    } else {
        Serial.printf("[NETWORK] Erreur POST : HTTP %d\n", httpCode);
        String response = http.getString();
        Serial.println("[NETWORK] Réponse : " + response);
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
    http.addHeader("X-Api-Key", API_KEY);
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
