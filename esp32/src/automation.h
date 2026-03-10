#ifndef AUTOMATION_H
#define AUTOMATION_H

#include <Arduino.h>
#include "sensors.h"

// Seuils d'automatisation (modifiables par commande du backend)
struct AutomationThresholds {
    float soilMoistureMin;     // % — déclenche arrosage si en dessous
    float temperatureMax;      // °C — déclenche ventilation si au dessus
    float waterLevelCritical;  // cm — bloque arrosage si en dessous
    int irrigationDurationSec; // durée d'un cycle d'arrosage
    int irrigationCooldownSec; // délai minimum entre deux arrosages
};

// Initialise les seuils avec les valeurs par défaut de config.h
void automationInit();

// Évalue les règles d'automatisation et déclenche les actions si nécessaire
// Retourne true si une action a été déclenchée
bool automationEvaluate(const SensorData& data);

// Modifie un seuil par son nom (appelé lors de la réception d'une commande set_threshold)
bool automationSetThreshold(const char* param, float value);

// Retourne les seuils courants
AutomationThresholds automationGetThresholds();

// Vérifie si l'arrosage est bloqué (cooldown ou niveau d'eau critique)
bool automationIsIrrigationBlocked();

// Lance un cycle d'arrosage manuel (commande backend)
void automationStartIrrigation(int durationSec);

// Annule un arrosage en cours immédiatement
void automationCancelIrrigation();

// Active ou désactive l'automatisation locale
void automationSetEnabled(bool enabled);

// Retourne vrai si l'automatisation est active
bool automationIsEnabled();

#endif // AUTOMATION_H
