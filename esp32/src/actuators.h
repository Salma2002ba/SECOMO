#ifndef ACTUATORS_H
#define ACTUATORS_H

#include <Arduino.h>

// Structure décrivant l'état courant de tous les actionneurs
struct ActuatorState {
    bool pumpMain;
    bool pumpPeristaltic;
    bool valveA;
    bool valveB;
    bool fan;
    bool led;
};

// Initialise toutes les pins relais en sortie, relais OFF
void actuatorsInit();

// Retourne l'état courant de tous les actionneurs
ActuatorState actuatorsGetState();

// Commandes individuelles
void pumpMainOn();
void pumpMainOff();
void pumpPeristalticOn();
void pumpPeristalticOff();
void valveAOn();
void valveAOff();
void valveBOn();
void valveBOff();
void fanOn();
void fanOff();
void ledOn();
void ledOff();

// Éteint tous les actionneurs (sécurité)
void actuatorsAllOff();

// Vérifie les watchdogs (durées max) et coupe si dépassement
// À appeler régulièrement dans la loop
void actuatorsWatchdog();

#endif // ACTUATORS_H
