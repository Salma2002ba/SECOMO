#include "actuators.h"
#include "config.h"

// Module relais actif LOW : LOW = relais ON, HIGH = relais OFF
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// --- État interne des actionneurs ---
static bool statePumpMain = false;
static bool statePumpPeristaltic = false;
static bool stateValveA = false;
static bool stateValveB = false;
static bool stateFan = false;
static bool stateLed = false;

// --- Timestamps d'activation pour watchdog ---
static unsigned long pumpMainStartMs = 0;
static unsigned long pumpPeristalticStartMs = 0;
static unsigned long fanStartMs = 0;

// ============================================================
// Fonctions internes
// ============================================================

static void setRelay(int pin, bool on) {
    digitalWrite(pin, on ? RELAY_ON : RELAY_OFF);
}

// ============================================================
// Initialisation
// ============================================================

void actuatorsInit() {
    int pins[] = {
        PIN_RELAY_PUMP_MAIN, PIN_RELAY_PUMP_PERISTALTIC,
        PIN_RELAY_VALVE_A, PIN_RELAY_VALVE_B,
        PIN_RELAY_FAN, PIN_RELAY_LED,
        PIN_RELAY_SPARE_1, PIN_RELAY_SPARE_2
    };

    for (int i = 0; i < 8; i++) {
        pinMode(pins[i], OUTPUT);
        digitalWrite(pins[i], RELAY_OFF); // Tous les relais OFF au démarrage
    }

    Serial.println("[ACTUATORS] Relais initialisés (tous OFF)");
}

// ============================================================
// Getters
// ============================================================

ActuatorState actuatorsGetState() {
    ActuatorState state;
    state.pumpMain = statePumpMain;
    state.pumpPeristaltic = statePumpPeristaltic;
    state.valveA = stateValveA;
    state.valveB = stateValveB;
    state.fan = stateFan;
    state.led = stateLed;
    return state;
}

// ============================================================
// Commandes individuelles
// ============================================================

void pumpMainOn() {
    if (!statePumpMain) {
        pumpMainStartMs = millis();
    }
    statePumpMain = true;
    setRelay(PIN_RELAY_PUMP_MAIN, true);
    Serial.println("[ACTUATORS] Pompe principale ON");
}

void pumpMainOff() {
    statePumpMain = false;
    setRelay(PIN_RELAY_PUMP_MAIN, false);
    Serial.println("[ACTUATORS] Pompe principale OFF");
}

void pumpPeristalticOn() {
    if (!statePumpPeristaltic) {
        pumpPeristalticStartMs = millis();
    }
    statePumpPeristaltic = true;
    setRelay(PIN_RELAY_PUMP_PERISTALTIC, true);
    Serial.println("[ACTUATORS] Pompe péristaltique ON");
}

void pumpPeristalticOff() {
    statePumpPeristaltic = false;
    setRelay(PIN_RELAY_PUMP_PERISTALTIC, false);
    Serial.println("[ACTUATORS] Pompe péristaltique OFF");
}

void valveAOn() {
    stateValveA = true;
    setRelay(PIN_RELAY_VALVE_A, true);
    Serial.println("[ACTUATORS] Vanne A OUVERTE");
}

void valveAOff() {
    stateValveA = false;
    setRelay(PIN_RELAY_VALVE_A, false);
    Serial.println("[ACTUATORS] Vanne A FERMÉE");
}

void valveBOn() {
    stateValveB = true;
    setRelay(PIN_RELAY_VALVE_B, true);
    Serial.println("[ACTUATORS] Vanne B OUVERTE");
}

void valveBOff() {
    stateValveB = false;
    setRelay(PIN_RELAY_VALVE_B, false);
    Serial.println("[ACTUATORS] Vanne B FERMÉE");
}

void fanOn() {
    if (!stateFan) {
        fanStartMs = millis();
    }
    stateFan = true;
    setRelay(PIN_RELAY_FAN, true);
    Serial.println("[ACTUATORS] Ventilateur ON");
}

void fanOff() {
    stateFan = false;
    setRelay(PIN_RELAY_FAN, false);
    Serial.println("[ACTUATORS] Ventilateur OFF");
}

void ledOn() {
    stateLed = true;
    setRelay(PIN_RELAY_LED, true);
    Serial.println("[ACTUATORS] LED horticole ON");
}

void ledOff() {
    stateLed = false;
    setRelay(PIN_RELAY_LED, false);
    Serial.println("[ACTUATORS] LED horticole OFF");
}

// ============================================================
// Sécurité
// ============================================================

void actuatorsAllOff() {
    pumpMainOff();
    pumpPeristalticOff();
    valveAOff();
    valveBOff();
    fanOff();
    ledOff();
    Serial.println("[ACTUATORS] TOUS les actionneurs OFF (sécurité)");
}

void actuatorsWatchdog() {
    unsigned long now = millis();

    // Watchdog pompe principale
    if (statePumpMain && (now - pumpMainStartMs > (unsigned long)PUMP_MAX_DURATION_SEC * 1000UL)) {
        Serial.println("[ACTUATORS] WATCHDOG : pompe principale coupée (durée max atteinte)");
        pumpMainOff();
        valveAOff(); // Couper aussi la vanne liée
    }

    // Watchdog pompe péristaltique
    if (statePumpPeristaltic && (now - pumpPeristalticStartMs > (unsigned long)PERISTALTIC_MAX_DURATION_SEC * 1000UL)) {
        Serial.println("[ACTUATORS] WATCHDOG : pompe péristaltique coupée (durée max atteinte)");
        pumpPeristalticOff();
    }

    // Watchdog ventilateur
    if (stateFan && (now - fanStartMs > (unsigned long)FAN_MAX_DURATION_SEC * 1000UL)) {
        Serial.println("[ACTUATORS] WATCHDOG : ventilateur coupé (durée max atteinte)");
        fanOff();
    }
}
