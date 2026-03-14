#include "provisioning.h"
#include "config.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

static String _mac    = "";
static String _apiKey = "";

// ============================================================
// Helpers privés
// ============================================================

static bool _announce() {
    HTTPClient http;
    String url = String(BACKEND_URL) + ENDPOINT_PROV_ANNOUNCE;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    JsonDocument doc;
    doc["mac"] = _mac;
    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    http.end();
    Serial.printf("[PROV] announce → HTTP %d\n", code);
    return (code == 200 || code == 201);
}

static bool _claim(String& outKey) {
    HTTPClient http;
    String url = String(BACKEND_URL) + ENDPOINT_PROV_CLAIM + "?mac=" + _mac;
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);

    int code = http.GET();
    if (code != 200) { http.end(); return false; }

    String body = http.getString();
    http.end();

    JsonDocument doc;
    if (deserializeJson(doc, body)) return false;

    const char* status = doc["status"];
    if (!status || strcmp(status, "active") != 0) return false;

    const char* key = doc["api_key"];
    if (!key || strlen(key) == 0) return false;

    outKey = String(key);
    return true;
}

// ============================================================
// API publique
// ============================================================

bool provisioningIsConfigured() {
    _mac = WiFi.macAddress();
    _mac.toUpperCase();

    Preferences prefs;
    prefs.begin("secomo", true);
    _apiKey = prefs.getString("api_key", "");
    prefs.end();

    bool ok = (_apiKey.length() > 0);
    Serial.printf("[PROV] MAC: %s | configuré: %s\n", _mac.c_str(), ok ? "oui" : "non");
    return ok;
}

void provisioningRun() {
    Serial.println("[PROV] ==========================================");
    Serial.println("[PROV] Appareil non configuré.");
    Serial.printf ("[PROV] Adresse MAC : %s\n", _mac.c_str());
    Serial.println("[PROV] Scannez le QR code de cette machine dans l'app SECOMO.");
    Serial.println("[PROV] ==========================================");

    _announce();

    String key;
    int attempt = 0;

    while (true) {
        // Clignotement LED : 2 bips = en attente provisioning
        digitalWrite(PIN_STATUS_LED, HIGH); delay(100);
        digitalWrite(PIN_STATUS_LED, LOW);  delay(100);
        digitalWrite(PIN_STATUS_LED, HIGH); delay(100);
        digitalWrite(PIN_STATUS_LED, LOW);

        attempt++;
        if (attempt % 5 == 0) {
            Serial.printf("[PROV] Poll /api/esp/claim... (tentative %d)\n", attempt);
            if (_claim(key)) {
                Serial.println("[PROV] Clé API reçue !");
                break;
            }
        }
        delay(2000);
    }

    _apiKey = key;

    Preferences prefs;
    prefs.begin("secomo", false);
    prefs.putString("api_key", _apiKey);
    prefs.end();

    Serial.println("[PROV] Clé sauvegardée en NVS. Provisioning terminé !");
}

void provisioningClear() {
    Preferences prefs;
    prefs.begin("secomo", false);
    prefs.clear();
    prefs.end();
    _apiKey = "";
    Serial.println("[PROV] Credentials effacés (factory reset).");
}

String provisioningGetMac()    { return _mac; }
String provisioningGetApiKey() { return _apiKey; }
