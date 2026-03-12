#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// SECOMO — Configuration générale
// ============================================================

// --- WiFi ---
#define WIFI_SSID     "S25 Ultra de Arthur"
#define WIFI_PASSWORD "arthuro27"
#define WIFI_RECONNECT_INTERVAL_MS 30000  // 30 secondes entre tentatives

// --- Backend API ---
#define BACKEND_URL       "http://10.56.224.208:8000"
#define API_KEY           "a2433a1c45c6f59fe97bbcad862e53acc63eedd4f78b9b1f9e9cf78555708c17"
#define ENDPOINT_SENSOR   "/api/esp/readings"
#define ENDPOINT_COMMANDS "/api/commands"
#define HTTP_TIMEOUT_MS   10000  // 10 secondes

// --- Intervalles ---
#define SENSOR_READ_INTERVAL_MS  5000    // Lecture capteurs toutes les 5 s (test)
#define SEND_INTERVAL_MS         10000   // Envoi données toutes les 10 s (test)
#define COMMAND_POLL_INTERVAL_MS 30000   // Récupération commandes toutes les 30 s

// --- Pins capteurs analogiques ---
#define PIN_SOIL_MOISTURE_1 32   // Capteur capacitif V2.0.0
#define PIN_SOIL_MOISTURE_2 -1   // Non utilisé (un seul capteur capacitif)
#define PIN_PH              33
#define PIN_BATTERY_ADC     36   // Pont diviseur 100k+100k → batterie (max ~6.6V)

// --- Pins I2C (BME280 + BH1750) ---
#define PIN_SDA 21
#define PIN_SCL 22

// --- Pins HC-SR04 (ultrason) ---
#define PIN_TRIG 5
#define PIN_ECHO 18

// --- Pins relais (actionneurs) ---
#define PIN_RELAY_PUMP_MAIN       26   // Pompe à eau 3.3V → IN1
#define PIN_RELAY_PUMP_PERISTALTIC 27  // Pompe péristaltique 12V → IN2
#define PIN_RELAY_FAN             14   // Ventilateur 12V → IN3
#define PIN_RELAY_VALVE_A         12   // Électrovanne 12V → IN4
#define PIN_RELAY_LED             13   // LED → IN5
#define PIN_RELAY_VALVE_B         25   // Spare
#define PIN_RELAY_SPARE_1         15
#define PIN_RELAY_SPARE_2         4

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

// Luminosité : valeur lux → % (BH1750)
#define LIGHT_MAX_LUX    10000.0  // Lux considéré comme 100%

// Batterie : tension min/max (V) → %
// Adapter selon le type de batterie utilisé
#define BATT_DIVIDER_RATIO 2.0    // Rapport pont diviseur (100k + 100k)
#define BATT_FULL_V        4.2    // Tension batterie pleine (LiPo 1S)
#define BATT_EMPTY_V       3.0    // Tension batterie vide (coupure LiPo)

// pH : calibration deux points
#define PH_VOLTAGE_AT_PH7  2.5   // Tension (V) à pH 7.0
#define PH_VOLTAGE_AT_PH4  3.04  // Tension (V) à pH 4.0

// HC-SR04 : hauteur du réservoir
#define TANK_HEIGHT_CM 30.0  // Hauteur totale du réservoir en cm
#define HC_SR04_MAX_DISTANCE_CM 400

// --- Réseau : seuil mode dégradé ---
#define MAX_HTTP_FAILURES 3  // Passage en mode dégradé après N échecs

#endif // CONFIG_H
