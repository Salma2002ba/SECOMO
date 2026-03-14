#ifndef NETWORK_H
#define NETWORK_H

#include <Arduino.h>
#include "sensors.h"
#include "actuators.h"

// Initialise la connexion WiFi
void networkInit();

// Tente de (re)connecter le WiFi. Retourne true si connecté.
bool networkConnect();

// Vérifie si le WiFi est connecté
bool networkIsConnected();

// Envoie les données capteurs + état actionneurs au backend.
// Retourne true si envoi réussi (HTTP 200).
bool networkSendSensorData(const SensorData& sensors, const ActuatorState& actuators);

// Récupère les commandes depuis le backend.
// Remplit le buffer commandsJson (doit être alloué par l'appelant).
// Retourne true si des commandes ont été reçues.
bool networkFetchCommands(String& commandsJson);

// Retourne le nombre d'échecs HTTP consécutifs
int networkGetFailureCount();

// Réinitialise le compteur d'échecs
void networkResetFailureCount();

// Définit les credentials (MAC + clé API) issus du provisioning
void networkSetCredentials(const String& mac, const String& apiKey);

#endif // NETWORK_H
