#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>

// Structure contenant tous les relevés capteurs
struct SensorData {
    float soilMoisture1;   // % (0-100)
    float soilMoisture2;   // % (0-100)
    float temperature;     // °C
    float humidity;        // % (0-100)
    float pressure;        // hPa
    float lightLux;        // lux
    float waterLevelCm;    // cm
    float ph;              // 0-14
    float batteryLevel;    // % (0-100)
};

// Initialise tous les capteurs (I2C, pins analogiques, ultrason)
void sensorsInit();

// Lit tous les capteurs et remplit la structure SensorData
SensorData sensorsRead();

// Fonctions individuelles (utilisables pour le debug)
float readSoilMoisture(int pin);
float readWaterLevel();
float readPH();
float readBatteryLevel();

#endif // SENSORS_H
