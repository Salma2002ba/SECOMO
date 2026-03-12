#include "sensors.h"
#include "config.h"

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <NewPing.h>

// --- Objets capteurs ---
static Adafruit_BME280 bme;
static BH1750 lightMeter;
static NewPing sonar(PIN_TRIG, PIN_ECHO, HC_SR04_MAX_DISTANCE_CM);

static bool bmeReady = false;
static bool bh1750Ready = false;

// --- Buffer moyenne glissante pour humidité sol ---
#define SOIL_AVG_COUNT 5
static float soilBuffer1[SOIL_AVG_COUNT] = {0};
static float soilBuffer2[SOIL_AVG_COUNT] = {0};
static int soilBufferIndex = 0;
static bool soilBufferFilled = false;

// ============================================================
// Fonctions utilitaires
// ============================================================

// Convertit une valeur ADC brute en pourcentage d'humidité du sol
static float adcToSoilPercent(int adcValue) {
    if (adcValue <= 0 || adcValue >= 4095) {
        return -1.0; // Capteur déconnecté ou hors plage
    }
    float percent = (float)(SOIL_DRY_VALUE - adcValue) / (float)(SOIL_DRY_VALUE - SOIL_WET_VALUE) * 100.0;
    if (percent < 0.0) percent = 0.0;
    if (percent > 100.0) percent = 100.0;
    return percent;
}

// Calcule la moyenne d'un buffer
static float bufferAverage(float* buffer, int count) {
    float sum = 0;
    for (int i = 0; i < count; i++) {
        sum += buffer[i];
    }
    return sum / (float)count;
}

// ============================================================
// Initialisation
// ============================================================

void sensorsInit() {
    // Initialiser I2C
    Wire.begin(PIN_SDA, PIN_SCL);

    // BME280
    if (bme.begin(0x76)) {
        bmeReady = true;
        Serial.println("[SENSORS] BME280 détecté (0x76)");
    } else if (bme.begin(0x77)) {
        bmeReady = true;
        Serial.println("[SENSORS] BME280 détecté (0x77)");
    } else {
        Serial.println("[SENSORS] ERREUR : BME280 non détecté !");
    }

    // BH1750 — essai adresse 0x23 (ADD=GND) puis 0x5C (ADD=VCC)
    if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23)) {
        bh1750Ready = true;
        Serial.println("[SENSORS] BH1750 détecté (adresse 0x23)");
    } else if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C)) {
        bh1750Ready = true;
        Serial.println("[SENSORS] BH1750 détecté (adresse 0x5C)");
    } else {
        Serial.println("[SENSORS] ERREUR : BH1750 non détecté (0x23 et 0x5C essayés) !");
    }

    // Pins analogiques (pas de config nécessaire sur ESP32, ADC auto)
    Serial.println("[SENSORS] Capteurs initialisés");
}

// ============================================================
// Lecture individuelle
// ============================================================

float readSoilMoisture(int pin) {
    int raw = analogRead(pin);
    return adcToSoilPercent(raw);
}

float readWaterLevel() {
    unsigned long distanceCm = sonar.ping_cm();
    if (distanceCm == 0) {
        // 0 signifie pas d'écho reçu (hors portée ou erreur)
        return -1.0;
    }
    // Le capteur mesure la distance jusqu'à la surface de l'eau.
    // Niveau d'eau = hauteur du réservoir - distance mesurée
    float level = TANK_HEIGHT_CM - (float)distanceCm;
    if (level < 0) level = 0;
    return level;
}

float readBatteryLevel() {
    int raw = analogRead(PIN_BATTERY_ADC);
    if (raw <= 0) return -1.0;
    // ADC → tension réelle (pont diviseur)
    float voltage = ((float)raw / 4095.0) * 3.3 * BATT_DIVIDER_RATIO;
    // Tension → pourcentage
    float pct = (voltage - BATT_EMPTY_V) / (BATT_FULL_V - BATT_EMPTY_V) * 100.0;
    if (pct < 0.0) pct = 0.0;
    if (pct > 100.0) pct = 100.0;
    return pct;
}

float readPH() {
    int raw = analogRead(PIN_PH);
    if (raw <= 0 || raw >= 4095) {
        return -1.0;
    }
    // Conversion ADC → tension (3.3V, 12 bits)
    float voltage = (float)raw / 4095.0 * 3.3;

    // Calibration linéaire deux points :
    // pH = 7.0 + (PH_VOLTAGE_AT_PH7 - voltage) / pente
    // pente = (PH_VOLTAGE_AT_PH7 - PH_VOLTAGE_AT_PH4) / (7.0 - 4.0)
    float slope = (PH_VOLTAGE_AT_PH7 - PH_VOLTAGE_AT_PH4) / (7.0 - 4.0);
    float ph = 7.0 + (PH_VOLTAGE_AT_PH7 - voltage) / slope;

    if (ph < 0.0 || ph > 14.0) {
        return -1.0;
    }
    return ph;
}

// ============================================================
// Lecture de tous les capteurs
// ============================================================

SensorData sensorsRead() {
    SensorData data;

    // --- Humidité sol (avec moyenne glissante) ---
    float soil1 = readSoilMoisture(PIN_SOIL_MOISTURE_1);
    float soil2 = (PIN_SOIL_MOISTURE_2 >= 0) ? readSoilMoisture(PIN_SOIL_MOISTURE_2) : -1.0;

    if (soil1 >= 0) {
        soilBuffer1[soilBufferIndex] = soil1;
    }
    if (soil2 >= 0) {
        soilBuffer2[soilBufferIndex] = soil2;
    }
    soilBufferIndex = (soilBufferIndex + 1) % SOIL_AVG_COUNT;
    if (soilBufferIndex == 0) soilBufferFilled = true;

    int avgCount = soilBufferFilled ? SOIL_AVG_COUNT : (soilBufferIndex > 0 ? soilBufferIndex : 1);
    data.soilMoisture1 = (soil1 >= 0) ? bufferAverage(soilBuffer1, avgCount) : -1.0;
    data.soilMoisture2 = (soil2 >= 0) ? bufferAverage(soilBuffer2, avgCount) : -1.0;

    // --- BME280 ---
    if (bmeReady) {
        data.temperature = bme.readTemperature();
        data.humidity = bme.readHumidity();
        data.pressure = bme.readPressure() / 100.0; // Pa → hPa

        // Vérification plage réaliste
        if (data.temperature < -10.0 || data.temperature > 60.0) data.temperature = -1.0;
        if (data.humidity < 0.0 || data.humidity > 100.0) data.humidity = -1.0;
        if (data.pressure < 800.0 || data.pressure > 1200.0) data.pressure = -1.0;
    } else {
        data.temperature = -1.0;
        data.humidity = -1.0;
        data.pressure = -1.0;
    }

    // --- BH1750 ---
    if (bh1750Ready) {
        data.lightLux = lightMeter.readLightLevel();
    } else {
        data.lightLux = -1.0;
    }

    // --- Niveau d'eau ---
    data.waterLevelCm = readWaterLevel();

    // --- pH ---
    data.ph = readPH();

    // --- Batterie ---
    data.batteryLevel = readBatteryLevel();

    // Log
    Serial.printf("[SENSORS] T=%.1f°C H=%.1f%% P=%.1fhPa Lux=%.0f Sol1=%.1f%% Sol2=%.1f%% Eau=%.1fcm pH=%.1f Batt=%.0f%%\n",
        data.temperature, data.humidity, data.pressure, data.lightLux,
        data.soilMoisture1, data.soilMoisture2, data.waterLevelCm, data.ph, data.batteryLevel);

    return data;
}
