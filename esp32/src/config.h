#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// SECOMO — Configuration générale
// ============================================================

// --- Identifiant du dispositif ---
#define DEVICE_ID "secomo-001"

// --- ID de la plante dans le backend ---
#define PLANT_ID 1

// --- WiFi ---
#define WIFI_SSID     "VOTRE_SSID"
#define WIFI_PASSWORD "VOTRE_MOT_DE_PASSE"
#define WIFI_RECONNECT_INTERVAL_MS 30000  // 30 secondes entre tentatives

// --- Backend API ---
#define BACKEND_URL       "http://192.168.1.100:8000"
#define ENDPOINT_SENSOR   "/api/sensor-data"
#define ENDPOINT_COMMANDS "/api/commands"
#define HTTP_TIMEOUT_MS   10000  // 10 secondes

// --- Intervalles ---
#define SENSOR_READ_INTERVAL_MS  30000   // Lecture capteurs toutes les 30 s
#define SEND_INTERVAL_MS         300000  // Envoi données toutes les 5 min
#define COMMAND_POLL_INTERVAL_MS 30000   // Récupération commandes toutes les 30 s

// --- Pins capteurs analogiques ---
#define PIN_SOIL_MOISTURE_1 34
#define PIN_SOIL_MOISTURE_2 35
#define PIN_PH              32

// --- Pins I2C (BME280 + BH1750) ---
#define PIN_SDA 21
#define PIN_SCL 22

// --- Pins HC-SR04 (ultrason) ---
#define PIN_TRIG 5
#define PIN_ECHO 18

// --- Pins relais (actionneurs) ---
#define PIN_RELAY_PUMP_MAIN       13
#define PIN_RELAY_PUMP_PERISTALTIC 12
#define PIN_RELAY_VALVE_A         14
#define PIN_RELAY_VALVE_B         27
#define PIN_RELAY_FAN             26
#define PIN_RELAY_LED             25
#define PIN_RELAY_SPARE_1         33
#define PIN_RELAY_SPARE_2         15

// --- LED de statut (intégrée ESP32) ---
#define PIN_STATUS_LED 2

// --- Seuils d'automatisation ---
#define SOIL_MOISTURE_MIN         40.0   // % — seuil déclenchement arrosage
#define TEMPERATURE_MAX           30.0   // °C — seuil déclenchement ventilation
#define WATER_LEVEL_CRITICAL_CM   5.0    // cm — seuil critique niveau eau

// --- Durées actionneurs ---
#define IRRIGATION_DURATION_SEC   30     // Durée arrosage par défaut (secondes)
#define PUMP_MAX_DURATION_SEC     120    // Durée max pompe principale
#define PERISTALTIC_MAX_DURATION_SEC 30  // Durée max pompe péristaltique
#define FAN_MAX_DURATION_SEC      1800   // Durée max ventilateur (30 min)
#define IRRIGATION_COOLDOWN_SEC   1800   // Anti-rebond arrosage (30 min)

// --- Calibration capteurs ---
// Humidité sol : valeurs ADC brutes
#define SOIL_DRY_VALUE   4095  // ADC quand le sol est sec
#define SOIL_WET_VALUE   1500  // ADC quand le sol est mouillé

// pH : calibration deux points
#define PH_VOLTAGE_AT_PH7  2.5   // Tension (V) à pH 7.0
#define PH_VOLTAGE_AT_PH4  3.04  // Tension (V) à pH 4.0

// HC-SR04 : hauteur du réservoir
#define TANK_HEIGHT_CM 30.0  // Hauteur totale du réservoir en cm
#define HC_SR04_MAX_DISTANCE_CM 400

// --- Réseau : seuil mode dégradé ---
#define MAX_HTTP_FAILURES 3  // Passage en mode dégradé après N échecs

#endif // CONFIG_H
