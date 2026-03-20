# SECOMO — Procédure de test avec ESP32 réel

## Prérequis réseau

PC et ESP32 doivent être sur le **même réseau WiFi**.
→ Utiliser le hotspot **"S25 Ultra de Arthur"** (WPA2, 2.4 GHz)

1. Active le hotspot sur ton téléphone
2. Connecte le PC au hotspot
3. Vérifie l'IP du PC :
   ```powershell
   ipconfig
   ```
   → Cherche la ligne `Adresse IPv4` sous `Carte réseau sans fil Wi-Fi`

4. Si l'IP a changé depuis la dernière session → mettre à jour dans :
   ```
   esp32/src/config.h
   ```
   Ligne à modifier :
   ```c
   #define BACKEND_URL "http://TON_IP:8000"
   ```
   Dernière IP connue : **10.48.205.208**

---

## Re-flasher l'ESP32 (si config.h modifié)

ESP32 branché en USB sur COM3.

```powershell
cd "C:\Users\Desaubliaux\OneDrive - Aix-Marseille Université\Bureau\Projet_interEcole\Partie_Arthur\esp32"
& "C:\Users\Desaubliaux\AppData\Roaming\Python\Python313\Scripts\pio.exe" run --target upload
```

> Si l'upload échoue à mi-chemin → maintenir le bouton **BOOT** sur l'ESP32 pendant toute la phase "Writing..." et relancer.

---

## Démarrer le backend

```powershell
# 1. Démarrer la base de données PostgreSQL
docker start backend-db-1

# 2. Activer le venv Python
cd "C:\Users\Desaubliaux\OneDrive - Aix-Marseille Université\Bureau\Projet_interEcole\Partie_Arthur\backend"
# (activer ton venv ici)

# 3. Lancer le serveur
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Vérification que le backend répond :
```powershell
curl http://10.48.205.208:8000/docs
```
→ Doit retourner quelque chose (même une erreur FastAPI = backend OK)

---

## Démarrer le frontend

Dans un autre terminal :
```powershell
cd "C:\Users\Desaubliaux\OneDrive - Aix-Marseille Université\Bureau\Projet_interEcole\Partie_Arthur\frontend"
npm run dev
```

---

## Vérifier que l'ESP32 envoie des données

### Moniteur série (boot + connexion WiFi)
```powershell
python -c "import serial; s=serial.Serial('COM3',115200,timeout=2); [print(s.readline().decode('utf-8','ignore').strip()) for _ in range(200)]"
```
Messages attendus :
```
[NETWORK] Connecté ! IP : 10.48.x.x
[PROV] announce → HTTP 200
[NETWORK] Données envoyées avec succès (201)
```

### Log des données reçues par le backend
```powershell
Get-Content "C:\Users\Desaubliaux\OneDrive - Aix-Marseille Université\Bureau\Projet_interEcole\Partie_Arthur\backend\esp32_data.log" -Wait -Tail 10
```
→ Les lignes doivent s'accumuler avec la date du jour.

---

## Provisioning (première utilisation ou nouvel ESP32)

Si l'ESP32 affiche `[PROV] Appareil non configuré` dans le moniteur série :

1. Note l'adresse MAC affichée : **B0:CB:D8:C7:34:E0**
2. Dans l'app → **Configuration** → créer une station si besoin
3. Créer un **nouveau bac** → entrer la MAC dans le champ prévu
4. L'ESP32 reçoit sa clé automatiquement → `[PROV] claim → HTTP 200`

---

## Capteurs branchés / non branchés

| Capteur | État | Affichage app |
|---|---|---|
| Humidité sol (GPIO32) | ✅ branché | valeur réelle ~32% |
| Luminosité BH1750 (I2C 0x23) | ✅ branché | valeur réelle ~145 lux intérieur |
| Température/Humidité BME280 | ✅ branché (0x76) | valeur réelle |
| pH sol (GPIO33) | ❌ pas branché | affiche N/C |
| Niveau eau HC-SR04 | ❌ pas branché | affiche 0 cm |
| Batterie (GPIO36) | ❌ filaire | affiche 100% (prise) |

---

## Revenir en simulation (ESP32 débranché)

Rien à faire. L'app bascule automatiquement en simulation
dès que l'ESP32 arrête d'envoyer. Pour reprendre les données réelles :
brancher l'ESP32 → il se reconnecte tout seul.
