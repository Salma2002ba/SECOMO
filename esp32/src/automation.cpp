#include "automation.h"
#include "config.h"
#include "actuators.h"

// --- Seuils courants ---
static AutomationThresholds thresholds;

// --- État interne ---
static unsigned long lastIrrigationEndMs = 0;
static bool irrigationInProgress = false;
static unsigned long irrigationStartMs = 0;
static int irrigationDurationMs = 0;

// ============================================================
// Initialisation
// ============================================================

void automationInit() {
    thresholds.soilMoistureMin = SOIL_MOISTURE_MIN;
    thresholds.temperatureMax = TEMPERATURE_MAX;
    thresholds.waterLevelCritical = WATER_LEVEL_CRITICAL_CM;
    thresholds.irrigationDurationSec = IRRIGATION_DURATION_SEC;
    thresholds.irrigationCooldownSec = IRRIGATION_COOLDOWN_SEC;

    Serial.println("[AUTO] Automatisation initialisée avec seuils par défaut");
    Serial.printf("[AUTO] Humidité min=%0.f%% | Temp max=%.0f°C | Eau critique=%.0fcm\n",
        thresholds.soilMoistureMin, thresholds.temperatureMax, thresholds.waterLevelCritical);
}

// ============================================================
// Vérifications
// ============================================================

bool automationIsIrrigationBlocked() {
    unsigned long now = millis();

    // Vérifier le cooldown
    if (lastIrrigationEndMs > 0) {
        unsigned long elapsed = now - lastIrrigationEndMs;
        if (elapsed < (unsigned long)thresholds.irrigationCooldownSec * 1000UL) {
            return true; // Cooldown actif
        }
    }

    return false;
}

// ============================================================
// Gestion de l'arrosage en cours
// ============================================================

static void checkIrrigationProgress() {
    if (!irrigationInProgress) return;

    unsigned long now = millis();
    if (now - irrigationStartMs >= (unsigned long)irrigationDurationMs) {
        // Fin du cycle d'arrosage
        pumpMainOff();
        delay(500); // Attendre avant de fermer la vanne
        valveAOff();

        irrigationInProgress = false;
        lastIrrigationEndMs = millis();
        Serial.println("[AUTO] Cycle d'arrosage terminé");
    }
}

// ============================================================
// Évaluation des règles
// ============================================================

bool automationEvaluate(const SensorData& data) {
    bool actionTriggered = false;

    // Gérer un arrosage en cours
    checkIrrigationProgress();

    // --- Règle 1 : Arrosage automatique ---
    if (!irrigationInProgress) {
        // Prendre la moyenne des deux capteurs (ignorer ceux en erreur)
        float soilMoisture = -1.0;
        if (data.soilMoisture1 >= 0 && data.soilMoisture2 >= 0) {
            soilMoisture = (data.soilMoisture1 + data.soilMoisture2) / 2.0;
        } else if (data.soilMoisture1 >= 0) {
            soilMoisture = data.soilMoisture1;
        } else if (data.soilMoisture2 >= 0) {
            soilMoisture = data.soilMoisture2;
        }

        if (soilMoisture >= 0 && soilMoisture < thresholds.soilMoistureMin) {
            // Vérifier que l'arrosage n'est pas bloqué
            if (!automationIsIrrigationBlocked()) {
                // Vérifier le niveau d'eau
                if (data.waterLevelCm < 0 || data.waterLevelCm < thresholds.waterLevelCritical) {
                    Serial.println("[AUTO] ALERTE : niveau d'eau critique ou inconnu, arrosage bloqué !");
                } else {
                    Serial.printf("[AUTO] Humidité sol (%.1f%%) < seuil (%.1f%%) → arrosage !\n",
                        soilMoisture, thresholds.soilMoistureMin);
                    automationStartIrrigation(thresholds.irrigationDurationSec);
                    actionTriggered = true;
                }
            }
        }
    }

    // --- Règle 2 : Ventilation automatique ---
    if (data.temperature >= 0) {
        if (data.temperature > thresholds.temperatureMax) {
            ActuatorState state = actuatorsGetState();
            if (!state.fan) {
                Serial.printf("[AUTO] Température (%.1f°C) > seuil (%.1f°C) → ventilateur ON\n",
                    data.temperature, thresholds.temperatureMax);
                fanOn();
                actionTriggered = true;
            }
        } else if (data.temperature < thresholds.temperatureMax - 2.0) {
            // Hystérésis : éteindre le ventilateur 2°C en dessous du seuil
            ActuatorState state = actuatorsGetState();
            if (state.fan) {
                Serial.printf("[AUTO] Température (%.1f°C) redescendue → ventilateur OFF\n",
                    data.temperature);
                fanOff();
                actionTriggered = true;
            }
        }
    }

    return actionTriggered;
}

// ============================================================
// Arrosage manuel (commande backend)
// ============================================================

void automationStartIrrigation(int durationSec) {
    if (irrigationInProgress) {
        Serial.println("[AUTO] Arrosage déjà en cours, ignoré");
        return;
    }

    Serial.printf("[AUTO] Démarrage arrosage (%d s)\n", durationSec);

    // Ouvrir vanne A d'abord, puis pompe
    valveAOn();
    delay(200); // Laisser la vanne s'ouvrir
    pumpMainOn();

    irrigationInProgress = true;
    irrigationStartMs = millis();
    irrigationDurationMs = durationSec * 1000;
}

// ============================================================
// Modification des seuils
// ============================================================

bool automationSetThreshold(const char* param, float value) {
    if (strcmp(param, "soil_moisture_min") == 0) {
        thresholds.soilMoistureMin = value;
        Serial.printf("[AUTO] Seuil humidité min → %.1f%%\n", value);
        return true;
    }
    if (strcmp(param, "temperature_max") == 0) {
        thresholds.temperatureMax = value;
        Serial.printf("[AUTO] Seuil température max → %.1f°C\n", value);
        return true;
    }
    if (strcmp(param, "water_level_critical") == 0) {
        thresholds.waterLevelCritical = value;
        Serial.printf("[AUTO] Seuil eau critique → %.1f cm\n", value);
        return true;
    }
    if (strcmp(param, "irrigation_duration") == 0) {
        thresholds.irrigationDurationSec = (int)value;
        Serial.printf("[AUTO] Durée arrosage → %d s\n", (int)value);
        return true;
    }
    if (strcmp(param, "irrigation_cooldown") == 0) {
        thresholds.irrigationCooldownSec = (int)value;
        Serial.printf("[AUTO] Cooldown arrosage → %d s\n", (int)value);
        return true;
    }

    Serial.printf("[AUTO] Paramètre inconnu : %s\n", param);
    return false;
}

AutomationThresholds automationGetThresholds() {
    return thresholds;
}
