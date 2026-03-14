#ifndef PROVISIONING_H
#define PROVISIONING_H

#include <Arduino.h>

// Vérifie si l'appareil possède déjà une clé API en mémoire flash (NVS).
// Charge aussi la MAC et la clé en mémoire. À appeler après networkInit().
bool provisioningIsConfigured();

// Lance le provisioning :
//   1. Annonce au backend (POST /api/esp/announce)
//   2. Poll /api/esp/claim toutes les 10s jusqu'à réception de la clé
//   3. Sauvegarde la clé en NVS
// Bloque jusqu'à réception. Nécessite le WiFi connecté.
void provisioningRun();

// Efface les credentials (factory reset)
void provisioningClear();

// Getters (disponibles après provisioningIsConfigured() ou provisioningRun())
String provisioningGetMac();
String provisioningGetApiKey();

#endif // PROVISIONING_H
