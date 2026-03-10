
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  User, Device, PlantProfile, SensorReading, Alert, Role, Station,
  WateringMode, WateringEvent, SensorStatus, Recommendation, AlertType, AlertCategory, ThemeType, UnitType, LanguageType
} from './types';
import { INITIAL_PLANTS, INITIAL_DEVICES, INITIAL_STATIONS, MOCK_USER } from './constants';
import SensorCard from './components/SensorCard';
import HistoryChart from './components/HistoryChart';
import WeatherWidget from './components/WeatherWidget';
import Landing from './components/Landing';
import Auth from './components/Auth';
import QRScanner from './components/QRScanner';

// --- API Services ---
import * as authService from './services/auth.service';
import * as deviceService from './services/device.service';
import * as plantService from './services/plant.service';
import * as sensorService from './services/sensor.service';
import * as wateringService from './services/watering.service';
import { getAccessToken } from './services/api';
import { wsService } from './services/ws.service';

// Convertit le format API (snake_case) vers le format frontend (camelCase)
function apiUserToUser(u: authService.UserOut): User {
  return {
    id: u.id, email: u.email, role: u.role as Role,
    firstName: u.first_name, lastName: u.last_name,
    createdAt: u.created_at, theme: u.theme as ThemeType,
    language: u.language as LanguageType, unit: u.unit as UnitType,
    timezone: u.timezone,
  };
}

function apiDeviceToDevice(d: deviceService.DeviceOut): Device {
  return {
    id: d.id, name: d.name, size: d.size as any, level: d.level as any,
    locationLabel: d.location_label, createdAt: d.created_at,
    isWatering: false, automationEnabled: d.automation_enabled,
    isLightOn: false, isFanOn: false,
    config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 10, phCalibrationOffset: 0 },
  };
}

function apiPlantToProfile(p: plantService.PlantOut): PlantProfile {
  return {
    id: p.id, name: p.name,
    humidityMin: p.humidity_min, humidityMax: p.humidity_max,
    tempMin: p.temp_min, tempMax: p.temp_max,
    lightMin: p.light_min, phMin: p.ph_min, phMax: p.ph_max,
    notes: p.notes || '',
  };
}

function apiReadingToReading(r: sensorService.SensorReadingOut, deviceId: string): SensorReading {
  return {
    deviceId, timestamp: r.timestamp,
    tempAir: r.temp_air ?? 0,
    humidity: r.humidity_soil ?? 0,
    light: r.light ?? 0,
    soilPh: r.soil_ph ?? 0,
    batteryLevel: (r as any).battery_level ?? 85,
  };
}

// --- SwipeSlider : glisser pour ajuster une valeur ---
const SwipeSlider: React.FC<{
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
  unit: string; label: string; color: string; isDark: boolean;
}> = ({ value, min, max, step = 1, onChange, unit, label, color, isDark }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(value);

  const handleMove = useCallback((clientX: number) => {
    if (!draggingRef.current || !trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const delta = clientX - startXRef.current;
    const range = max - min;
    const raw = startValueRef.current + (delta / Math.max(trackWidth, 1)) * range;
    const snapped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, snapped)));
  }, [min, max, step, onChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => { draggingRef.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };
  }, [handleMove]);

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`text-2xl font-black ${color}`}>{value}<span className="text-sm font-medium ml-1">{unit}</span></span>
      </div>
      <div
        ref={trackRef}
        className={`relative h-12 rounded-2xl cursor-ew-resize select-none overflow-hidden touch-none ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
        onMouseDown={e => { e.preventDefault(); draggingRef.current = true; startXRef.current = e.clientX; startValueRef.current = value; }}
        onTouchStart={e => { draggingRef.current = true; startXRef.current = e.touches[0].clientX; startValueRef.current = value; }}
      >
        <div className={`h-full transition-none ${color.includes('blue') ? 'bg-blue-600' : color.includes('amber') ? 'bg-amber-500' : 'bg-violet-600'}`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <i className="fas fa-arrows-left-right text-white/60 text-xs"></i>
          <span className="text-xs font-bold text-white/70">Glisser pour ajuster</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 px-1">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
};

// ============================================================
// Persistence localStorage — stations + métadonnées devices
// (le backend ne connaît pas les stations ni les bacPositions)
// ============================================================
interface LocalMeta {
  stations: Station[];
  deviceMeta: Record<string, {
    stationId?: string;
    bacPosition?: { row: number; col: number };
    currentPlantProfileId?: string;
  }>;
}

function getLocalMetaKey(userId: string) {
  return `secomo_meta_${userId}`;
}

function loadLocalMeta(userId: string): LocalMeta {
  try {
    const raw = localStorage.getItem(getLocalMetaKey(userId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { stations: [], deviceMeta: {} };
}

function saveLocalMeta(userId: string, meta: LocalMeta) {
  try {
    localStorage.setItem(getLocalMetaKey(userId), JSON.stringify(meta));
  } catch { /* ignore */ }
}

// Valeurs de base de simulation par device — calibrées pour générer des alertes réalistes
const SIM_BASES: Record<string, { tempAir: number; humidity: number; light: number; soilPh: number }> = {
  'dev-001': { tempAir: 31, humidity: 48, light: 55, soilPh: 6.3 }, // Basilic : temp haute + humidité basse
  'dev-002': { tempAir: 20, humidity: 58, light: 38, soilPh: 6.5 }, // Menthe : humidité basse + lumière basse
};

const App: React.FC = () => {
  // --- Routing & Auth State ---
  const [page, setPage] = useState<'landing' | 'login' | 'register' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // --- Main App State ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(INITIAL_STATIONS[0]?.id ?? null);
  const [plantProfiles, setPlantProfiles] = useState<PlantProfile[]>([]);
  const [history, setHistory] = useState<Record<string, SensorReading[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [wateringEvents, setWateringEvents] = useState<WateringEvent[]>([]);
  const [view, setView] = useState<'dashboard' | 'plantes' | 'alerts' | 'config' | 'activities' | 'profil'>('dashboard');
  const simulationActive = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const wateringTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const countdownIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // --- Profile Page State ---
  const [profileForm, setProfileForm] = useState<Partial<User>>({});
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // --- Plant CRUD State ---
  const [editingPlant, setEditingPlant] = useState<PlantProfile | null>(null);
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [deletingPlantId, setDeletingPlantId] = useState<string | null>(null);

  // --- Station / Bac Grid State ---
  const [stations, setStations] = useState<Station[]>(INITIAL_STATIONS);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [expandedStationId, setExpandedStationId] = useState<string | null>(INITIAL_STATIONS[0]?.id ?? null);
  const [swapSourceBacId, setSwapSourceBacId] = useState<string | null>(null);
  const [editingBac, setEditingBac] = useState<{ stationId: string; row: number; col: number } | null>(null);
  const [newBacName, setNewBacName] = useState('');
  const [newBacPhysicalId, setNewBacPhysicalId] = useState('');
  const [configuringBacId, setConfiguringBacId] = useState<string | null>(null);

  // --- Mode Manuel State ---
  const [manualDuration, setManualDuration] = useState(15);
  const [manualTargetTemp, setManualTargetTemp] = useState(22);
  const [wateringCountdown, setWateringCountdown] = useState<Record<string, number>>({});

  // --- Computed ---
  const selectedDevice = useMemo(() => 
    devices.find(d => d.id === selectedDeviceId), 
    [devices, selectedDeviceId]
  );

  const currentReading = useMemo(() => {
    if (!selectedDeviceId) return null;
    const deviceHistory = history[selectedDeviceId];
    return deviceHistory ? deviceHistory[deviceHistory.length - 1] : null;
  }, [history, selectedDeviceId]);

  const currentPlant = useMemo(() => {
    if (!selectedDevice) return null;
    return plantProfiles.find(p => p.id === selectedDevice.currentPlantProfileId);
  }, [selectedDevice, plantProfiles]);

  const isDarkMode = currentUser?.theme === 'dark';

  // --- Essayer de restaurer la session au démarrage ---
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      authService.getMe()
        .then(u => {
          setCurrentUser(apiUserToUser(u));
          setBackendOnline(true);
          setPage('app');
        })
        .catch(() => {
          // Token expiré ou backend down → landing
          setBackendOnline(false);
        });
    }
  }, []);

  // --- Charger les données quand l'user est connecté ---
  useEffect(() => {
    if (!currentUser) return;
    // Ne recharger que lors d'un vrai changement de compte (login), pas sur theme/langue
    if (prevUserIdRef.current === currentUser.id) return;
    prevUserIdRef.current = currentUser.id;

    const loadData = async () => {
      try {
        // Charger devices et plantes depuis l'API
        const [apiDevices, apiPlants] = await Promise.all([
          deviceService.getDevices(),
          plantService.getPlants(),
        ]);
        const devs = apiDevices.map(apiDeviceToDevice);
        const plants = apiPlants.map(apiPlantToProfile);

        // Fusionner avec les métadonnées locales (stations, positions, plante assignée)
        const localMeta = loadLocalMeta(currentUser.id);
        const devsWithMeta = devs.map(d => ({
          ...d,
          ...(localMeta.deviceMeta[d.id] || {}),
        }));

        const finalDevs = devsWithMeta.length > 0 ? devsWithMeta : INITIAL_DEVICES;
        const finalStations = localMeta.stations.length > 0 ? localMeta.stations : INITIAL_STATIONS;

        setDevices(finalDevs);
        setStations(finalStations);
        setPlantProfiles(plants.length > 0 ? plants : INITIAL_PLANTS);
        const firstDev = finalDevs[0];
        setSelectedDeviceId(firstDev.id);
        setSelectedStationId(firstDev.stationId || finalStations[0]?.id || null);
        setBackendOnline(true);

        // Charger l'historique des readings pour chaque device
        for (const dev of devs) {
          try {
            const readings = await sensorService.getReadings(dev.id, 60);
            if (readings.length > 0) {
              setHistory(prev => ({
                ...prev,
                [dev.id]: readings.map(r => apiReadingToReading(r, dev.id)),
              }));
            }
          } catch { /* pas de readings encore */ }
        }

        // Charger l'historique d'arrosage
        setWateringEvents([]); // Réinitialiser pour éviter les doublons
        for (const dev of devs) {
          try {
            const events = await wateringService.getWateringHistory(dev.id, 50);
            setWateringEvents(prev => [
              ...prev,
              ...events.map(e => ({
                id: e.id,
                deviceId: e.device_id,
                timestamp: e.started_at,
                mode: e.mode as WateringMode,
                durationSec: e.duration_sec,
                reason: e.reason || '',
              })),
            ]);
          } catch { /* pas d'events */ }
        }

        // Connecter le WebSocket
        const token = getAccessToken();
        if (token) {
          wsService.connect(token);
        }
      } catch {
        // Backend indisponible → fallback simulation
        console.log('[SECOMO] Backend indisponible, mode simulation activé');
        setBackendOnline(false);
        setDevices(INITIAL_DEVICES);
        setPlantProfiles(INITIAL_PLANTS);
        setSelectedDeviceId(INITIAL_DEVICES[0].id);
        simulationActive.current = true;
      }
    };

    loadData();

    return () => {
      wsService.disconnect();
    };
  }, [currentUser]);

  // --- WebSocket listeners ---
  useEffect(() => {
    if (!backendOnline) return;

    const onReading = (data: any, deviceId: string) => {
      const reading: SensorReading = {
        deviceId,
        timestamp: new Date().toISOString(),
        tempAir: data.temp_air ?? 0,
        humidity: data.humidity_soil ?? 0,
        light: data.light ?? 0,
        soilPh: data.soil_ph ?? 0,
        batteryLevel: data.battery_level ?? 85,
      };
      setHistory(prev => {
        const deviceHistory = [...(prev[deviceId] || []), reading];
        if (deviceHistory.length > 60) deviceHistory.shift();
        return { ...prev, [deviceId]: deviceHistory };
      });
    };

    const onAlert = (data: any, deviceId: string) => {
      const device = devices.find(d => d.id === deviceId);
      setAlerts(prev => {
        // Déduplication par device + catégorie (pas de plantName du backend pour l'instant)
        const existingIdx = prev.findIndex(
          a => a.deviceId === deviceId && a.category === data.category
        );
        const alert: Alert = {
          id: data.id || Math.random().toString(36).substr(2, 9),
          deviceId,
          deviceName: device?.name || 'Station',
          plantName: data.plant_name || 'Plante',
          category: data.category,
          type: data.type,
          message: data.message,
          timestamp: new Date().toISOString(),
        };
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = alert;
          return updated;
        }
        return [alert, ...prev].slice(0, 200);
      });
    };

    const onWateringStatus = (data: any, deviceId: string) => {
      setDevices(prev => prev.map(d =>
        d.id === deviceId ? { ...d, isWatering: data.is_watering } : d
      ));
      if (data.is_watering) {
        setWateringEvents(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          deviceId,
          timestamp: new Date().toISOString(),
          mode: data.mode as WateringMode || WateringMode.AUTO,
          durationSec: data.duration_sec || 0,
          reason: data.reason || '',
        }, ...prev]);
      }
    };

    wsService.on('sensor_reading', onReading);
    wsService.on('alert', onAlert);
    wsService.on('watering_status', onWateringStatus);

    return () => {
      wsService.off('sensor_reading', onReading);
      wsService.off('alert', onAlert);
      wsService.off('watering_status', onWateringStatus);
    };
  }, [backendOnline, devices]);

  // --- Sync profileForm ---
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        theme: currentUser.theme,
        language: currentUser.language,
        unit: currentUser.unit,
        timezone: currentUser.timezone,
      });
    }
  }, [currentUser]);

  // --- Rules Engine ---
  const formatTemp = (temp: number) => {
    if (currentUser?.unit === 'fahrenheit') {
      return (temp * 9/5) + 32;
    }
    return temp;
  };

  const getSensorStatus = (value: number, min: number, max: number): SensorStatus => {
    if (value < min) return 'low';
    if (value > max) return 'high';
    return 'ok';
  };

  const recommendations = useMemo((): Recommendation[] => {
    if (!currentReading || !currentPlant || !selectedDevice) return [];
    const recs: Recommendation[] = [];
    const isAuto = selectedDevice.automationEnabled;

    if (!isAuto) {
      // Mode Manuel : toutes les recommandations actionnables
      if (currentReading.humidity < currentPlant.humidityMin) {
        recs.push({ id: 'r1', text: `Humidité critique (${currentReading.humidity.toFixed(0)}%) : utilisez le bouton Arroser.`, severity: 'critical', action: 'water' });
      }
      if (currentReading.humidity > currentPlant.humidityMax) {
        recs.push({ id: 'r2', text: `Sol trop humide (${currentReading.humidity.toFixed(0)}%) : suspendez l'arrosage.`, severity: 'warning' });
      }
      if (currentReading.tempAir > currentPlant.tempMax) {
        recs.push({ id: 'r3', text: `Température trop élevée (${currentReading.tempAir.toFixed(1)}°C) : activez la ventilation.`, severity: 'warning', action: 'fan' });
      }
      if (currentReading.tempAir < currentPlant.tempMin) {
        recs.push({ id: 'r4', text: `Température trop basse (${currentReading.tempAir.toFixed(1)}°C) : protégez la plante du froid.`, severity: 'warning' });
      }
      if (currentReading.light < currentPlant.lightMin) {
        recs.push({ id: 'r5', text: `Lumière insuffisante (${currentReading.light.toFixed(0)}%) : activez l'éclairage LED.`, severity: 'info', action: 'light' });
      }
    } else {
      // Mode Auto : seulement la luminosité (si insuffisante malgré l'éclairage auto → déplacer le bac)
      if (currentReading.light < currentPlant.lightMin) {
        recs.push({ id: 'r6', text: `Lumière insuffisante (${currentReading.light.toFixed(0)}%) même avec éclairage automatique. Envisagez de déplacer le bac vers une zone plus lumineuse.`, severity: 'info', action: 'move' });
      }
    }
    return recs;
  }, [currentReading, currentPlant, selectedDevice]);

  // --- Alert Engine (check seulement la plante assignée au device) ---
  const checkAlerts = useCallback((reading: SensorReading, device: Device) => {
    const now = new Date().toISOString();

    // On ne vérifie que la plante assignée à ce device
    const assignedPlant = plantProfiles.find(p => p.id === device.currentPlantProfileId);
    if (!assignedPlant) {
      // Pas de plante assignée → effacer les alertes de ce device
      setAlerts(prev => prev.filter(a => a.deviceId !== device.id));
      return;
    }

    const problems: { plantName: string; category: AlertCategory; type: AlertType; message: string }[] = [];

    const plant = assignedPlant;

    // Humidité
    if (reading.humidity < plant.humidityMin) {
      const deficit = plant.humidityMin - reading.humidity;
      problems.push({
        plantName: plant.name,
        category: 'humidity',
        type: deficit > 15 ? 'critical' : 'warning',
        message: `Humidité basse : ${reading.humidity.toFixed(0)}% (min ${plant.humidityMin}% pour ${plant.name})`,
      });
    } else if (reading.humidity > plant.humidityMax) {
      problems.push({
        plantName: plant.name,
        category: 'humidity',
        type: 'warning',
        message: `Humidité élevée : ${reading.humidity.toFixed(0)}% (max ${plant.humidityMax}% pour ${plant.name})`,
      });
    }

    // Température
    if (reading.tempAir < plant.tempMin) {
      const deficit = plant.tempMin - reading.tempAir;
      problems.push({
        plantName: plant.name,
        category: 'temperature',
        type: deficit > 5 ? 'critical' : 'warning',
        message: `Température basse : ${reading.tempAir.toFixed(1)}°C (min ${plant.tempMin}°C pour ${plant.name})`,
      });
    } else if (reading.tempAir > plant.tempMax) {
      const excess = reading.tempAir - plant.tempMax;
      problems.push({
        plantName: plant.name,
        category: 'temperature',
        type: excess > 5 ? 'critical' : 'warning',
        message: `Température élevée : ${reading.tempAir.toFixed(1)}°C (max ${plant.tempMax}°C pour ${plant.name})`,
      });
    }

    // pH
    if (reading.soilPh < plant.phMin) {
      problems.push({
        plantName: plant.name,
        category: 'ph',
        type: 'warning',
        message: `pH sol bas : ${reading.soilPh.toFixed(1)} (min ${plant.phMin} pour ${plant.name})`,
      });
    } else if (reading.soilPh > plant.phMax) {
      problems.push({
        plantName: plant.name,
        category: 'ph',
        type: 'warning',
        message: `pH sol élevé : ${reading.soilPh.toFixed(1)} (max ${plant.phMax} pour ${plant.name})`,
      });
    }

    // Lumière
    if (reading.light < plant.lightMin) {
      problems.push({
        plantName: plant.name,
        category: 'light',
        type: 'info',
        message: `Lumière insuffisante : ${reading.light.toFixed(0)}% (min ${plant.lightMin}% pour ${plant.name}). Pensez à activer les LEDs.`,
      });
    }

    // Supprimer les alertes dont le problème n'existe plus (résolu)
    const activeCategories = new Set(problems.map(p => `${p.plantName}::${p.category}`));
    setAlerts(prev => {
      // Supprimer les alertes résolues pour ce device
      let updated = prev.filter(a =>
        a.deviceId !== device.id || activeCategories.has(`${a.plantName}::${a.category}`)
      );

      problems.forEach(problem => {
        // Chercher une alerte existante avec même device + plante + catégorie
        const existingIdx = updated.findIndex(
          a => a.deviceId === device.id
            && a.plantName === problem.plantName
            && a.category === problem.category
        );

        if (existingIdx !== -1) {
          // Mettre à jour l'alerte existante — repasse en "non lue" si le message change
          const prev = updated[existingIdx];
          const messageChanged = prev.message !== problem.message || prev.type !== problem.type;
          updated[existingIdx] = {
            ...prev,
            message: problem.message,
            type: problem.type,
            timestamp: now,
            read: messageChanged ? false : prev.read,
          };
        } else {
          // Nouvelle alerte
          updated.unshift({
            id: Math.random().toString(36).substr(2, 9),
            deviceId: device.id,
            deviceName: device.name,
            plantName: problem.plantName,
            category: problem.category,
            type: problem.type,
            message: problem.message,
            timestamp: now,
            read: false,
          });
        }
      });

      return updated.slice(0, 200);
    });
  }, [plantProfiles]);

  // --- Simulation Engine (actif uniquement si backend offline) ---
  const generateReading = useCallback((deviceId: string, prev?: SensorReading): SensorReading => {
    const defaultBase = SIM_BASES[deviceId] || { tempAir: 26, humidity: 52, light: 50, soilPh: 6.2 };
    const base = prev || { ...defaultBase, batteryLevel: 85 } as any;
    return {
      deviceId,
      timestamp: new Date().toISOString(),
      tempAir: Math.min(Math.max(base.tempAir + (Math.random() - 0.45) * 0.6, 5), 45),
      humidity: Math.min(Math.max(base.humidity + (Math.random() - 0.55) * 1.2, 0), 100),
      light: Math.min(Math.max(base.light + (Math.random() - 0.5) * 3, 0), 100),
      soilPh: Math.min(Math.max(base.soilPh + (Math.random() - 0.5) * 0.05, 0), 14),
      batteryLevel: Math.min(Math.max((base.batteryLevel ?? 85) - Math.random() * 0.05, 0), 100),
    };
  }, []);

  useEffect(() => {
    // Lancer la simulation si pas de données réelles (backend offline ou ESP32 non connecté)
    const hasRealData = devices.some(d => (history[d.id]?.length ?? 0) > 0);
    if (devices.length === 0 || (backendOnline && hasRealData)) return;

    // Générer l'historique initial si vide
    if (Object.keys(history).length === 0) {
      const initialHistory: Record<string, SensorReading[]> = {};
      const initialEvents: WateringEvent[] = [];
      devices.forEach(dev => {
        let last: SensorReading | undefined;
        const readings: SensorReading[] = [];
        for (let i = 0; i < 30; i++) {
          last = generateReading(dev.id, last);
          readings.push(last);
        }
        initialHistory[dev.id] = readings;

        // Générer quelques événements d'arrosage simulés dans les dernières 48h
        const now = Date.now();
        [48, 36, 24, 12, 4].forEach((hoursAgo, i) => {
          initialEvents.push({
            id: `sim-${dev.id}-${i}`,
            deviceId: dev.id,
            timestamp: new Date(now - hoursAgo * 3600 * 1000).toISOString(),
            mode: i % 2 === 0 ? WateringMode.AUTO : WateringMode.MANUAL,
            durationSec: [20, 30, 25, 15, 30][i],
            reason: i % 2 === 0 ? 'Humidité sol basse (auto)' : 'Arrosage manuel',
          });
        });
      });
      setHistory(initialHistory);
      setWateringEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        return [...prev, ...initialEvents.filter(e => !existingIds.has(e.id))];
      });
    }

    const interval = setInterval(() => {
      setHistory(prev => {
        const next = { ...prev };
        devices.forEach(dev => {
          const deviceHistory = [...(next[dev.id] || [])];
          const lastReading = deviceHistory[deviceHistory.length - 1];
          const newReading = generateReading(dev.id, lastReading);
          deviceHistory.push(newReading);
          if (deviceHistory.length > 60) deviceHistory.shift();
          next[dev.id] = deviceHistory;
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [backendOnline, devices, history, generateReading]);

  // --- Moteur d'alertes : réagit à chaque mise à jour de l'historique ---
  useEffect(() => {
    if (!devices.length || !Object.keys(history).length) return;
    devices.forEach(dev => {
      const deviceHistory = history[dev.id];
      if (!deviceHistory?.length) return;
      const latestReading = deviceHistory[deviceHistory.length - 1];
      checkAlerts(latestReading, dev);
    });
  }, [history, devices, checkAlerts]);

  // --- Actions ---
  const handleAuthSuccess = async (email: string, password?: string, firstName?: string, lastName?: string, isRegister?: boolean) => {
    try {
      let user: authService.UserOut;
      if (isRegister && password && firstName && lastName) {
        user = await authService.register(email, password, firstName, lastName);
      } else if (password) {
        user = await authService.login(email, password);
      } else {
        // Fallback simulation
        setCurrentUser({ ...MOCK_USER, email });
        setBackendOnline(false);
        simulationActive.current = true;
        setPage('app');
        return;
      }
      setCurrentUser(apiUserToUser(user));
      setBackendOnline(true);
      setPage('app');
    } catch (err: any) {
      // Fallback simulation si backend down
      console.log('[SECOMO] Auth fallback mode simulation:', err.message);
      setCurrentUser({ ...MOCK_USER, email });
      setBackendOnline(false);
      simulationActive.current = true;
      setPage('app');
    }
  };

  const handleLogout = () => {
    authService.logout();
    wsService.disconnect();
    setCurrentUser(null);
    setDevices([]);
    setPlantProfiles([]);
    setHistory({});
    setAlerts([]);
    setWateringEvents([]);
    setPage('landing');
    setView('dashboard');
  };

  // --- Synchronisation station → device sélectionné ---
  useEffect(() => {
    if (!selectedStationId) return;
    const stationDevices = devices.filter(d => d.stationId === selectedStationId);
    const currentDeviceInStation = stationDevices.find(d => d.id === selectedDeviceId);
    if (!currentDeviceInStation && stationDevices.length > 0) {
      setSelectedDeviceId(stationDevices[0].id);
    }
  }, [selectedStationId, devices]);

  // Sauvegarder les métadonnées locales dès que stations ou devices changent
  useEffect(() => {
    if (!currentUser || !devices.length) return;
    const meta: LocalMeta = {
      stations,
      deviceMeta: Object.fromEntries(
        devices.map(d => [d.id, {
          stationId: d.stationId,
          bacPosition: d.bacPosition,
          currentPlantProfileId: d.currentPlantProfileId,
        }])
      ),
    };
    saveLocalMeta(currentUser.id, meta);
  }, [stations, devices, currentUser]);

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    const newUser = { ...currentUser, ...updates };
    setCurrentUser(newUser);

    if (backendOnline) {
      try {
        await authService.updateMe({
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          theme: newUser.theme,
          language: newUser.language,
          unit: newUser.unit,
        });
      } catch { /* silently fail */ }
    }

    setStatusMsg({ text: 'Profil mis à jour avec succès.', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      setStatusMsg({ text: 'Les mots de passe ne correspondent pas.', type: 'error' });
      return;
    }

    if (backendOnline) {
      try {
        await authService.changePassword(passwordForm.current, passwordForm.next);
        setStatusMsg({ text: 'Mot de passe modifié.', type: 'success' });
      } catch (err: any) {
        setStatusMsg({ text: err.message || 'Erreur lors du changement.', type: 'error' });
        return;
      }
    } else {
      setStatusMsg({ text: 'Mot de passe modifié (simulation).', type: 'success' });
    }

    setPasswordForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const stopWateringCountdown = (deviceId: string) => {
    if (countdownIntervals.current[deviceId]) {
      clearInterval(countdownIntervals.current[deviceId]);
      delete countdownIntervals.current[deviceId];
    }
    setWateringCountdown(prev => { const n = { ...prev }; delete n[deviceId]; return n; });
  };

  const triggerWatering = async (deviceId: string, mode: WateringMode, reason: string, durationSec: number = 15) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: true } : d));

    // Démarrer le décompte
    setWateringCountdown(prev => ({ ...prev, [deviceId]: durationSec }));
    const countdownInterval = setInterval(() => {
      setWateringCountdown(prev => {
        const remaining = (prev[deviceId] ?? 1) - 1;
        if (remaining <= 0) {
          clearInterval(countdownIntervals.current[deviceId]);
          delete countdownIntervals.current[deviceId];
          const n = { ...prev }; delete n[deviceId]; return n;
        }
        return { ...prev, [deviceId]: remaining };
      });
    }, 1000);
    countdownIntervals.current[deviceId] = countdownInterval;

    const localEvent: WateringEvent = {
      id: Math.random().toString(36).substr(2, 9),
      deviceId, timestamp: new Date().toISOString(),
      mode, durationSec, reason,
    };

    if (backendOnline) {
      try {
        const event = await wateringService.triggerWatering(deviceId, durationSec, reason);
        setWateringEvents(prev => [{
          id: event.id,
          deviceId: event.device_id,
          timestamp: event.started_at,
          mode: event.mode as WateringMode,
          durationSec: event.duration_sec,
          reason: event.reason || '',
        }, ...prev]);
      } catch {
        // API indisponible → enregistrer localement quand même
        setWateringEvents(prev => [localEvent, ...prev]);
      }
    } else {
      setWateringEvents(prev => [localEvent, ...prev]);
    }

    const t = setTimeout(() => {
      delete wateringTimeouts.current[deviceId];
      stopWateringCountdown(deviceId);
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: false, lastWatering: new Date().toISOString() } : d));
    }, durationSec * 1000);
    wateringTimeouts.current[deviceId] = t;
  };

  const cancelWatering = (deviceId: string) => {
    if (wateringTimeouts.current[deviceId]) {
      clearTimeout(wateringTimeouts.current[deviceId]);
      delete wateringTimeouts.current[deviceId];
    }
    stopWateringCountdown(deviceId);
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: false } : d));
  };

  // --- Catalog search (debounced) ---
  const userLang = currentUser?.language?.toLowerCase() || 'fr';
  useEffect(() => {
    if (catalogSearch.length < 2) { setCatalogResults([]); return; }
    setCatalogLoading(true);
    const timer = setTimeout(() => {
      fetch(`http://localhost:8000/api/catalog/plants?q=${encodeURIComponent(catalogSearch)}&lang=${userLang}&limit=8`)
        .then(r => r.json())
        .then(data => { setCatalogResults(data); setCatalogLoading(false); })
        .catch(() => setCatalogLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogSearch, userLang]);

  const applyCatalogPlant = (cp: any) => {
    if (!editingPlant) return;
    const lightPct = cp.light_max_lux ? Math.round((cp.light_min_lux / cp.light_max_lux) * 100) : 50;
    // Use common name if available, fallback to scientific name
    const commonName = cp.common_names?.[userLang]?.[0] || cp.common_names?.fr?.[0] || cp.common_names?.en?.[0] || '';
    const displayName = commonName
      ? `${commonName.charAt(0).toUpperCase() + commonName.slice(1)} (${cp.name})`
      : cp.name;
    setEditingPlant({
      ...editingPlant,
      name: displayName,
      humidityMin: cp.soil_moisture_min ?? cp.humidity_min ?? 40,
      humidityMax: cp.soil_moisture_max ?? cp.humidity_max ?? 70,
      tempMin: cp.temp_min ?? 10,
      tempMax: cp.temp_max ?? 30,
      lightMin: Math.max(10, Math.min(100, lightPct)),
      phMin: 6.0,
      phMax: 7.0,
      notes: [cp.category, cp.origin].filter(Boolean).join(' — '),
    });
    setCatalogSearch('');
    setCatalogResults([]);
  };

  const handlePlantSave = async (plant: PlantProfile) => {
    const isNew = !plantProfiles.find(p => p.id === plant.id);
    const plantData = {
      name: plant.name,
      humidity_min: plant.humidityMin,
      humidity_max: plant.humidityMax,
      temp_min: plant.tempMin,
      temp_max: plant.tempMax,
      light_min: plant.lightMin,
      ph_min: plant.phMin,
      ph_max: plant.phMax,
      notes: plant.notes || '',
    };

    if (backendOnline) {
      try {
        if (isNew) {
          const created = await plantService.createPlant(plantData);
          const newPlant = { ...plant, id: created.id };
          setPlantProfiles(prev => [...prev, newPlant]);
          setEditingPlant(null);
          setView('config');
        } else {
          await plantService.updatePlant(plant.id, plantData);
          setPlantProfiles(prev => prev.map(p => p.id === plant.id ? plant : p));
          setEditingPlant(null);
        }
        return;
      } catch { /* fallback local */ }
    }
    // Mode hors-ligne : mise à jour locale uniquement
    if (isNew) {
      setPlantProfiles(prev => [...prev, plant]);
      setEditingPlant(null);
      setView('config');
    } else {
      setPlantProfiles(prev => prev.map(p => p.id === plant.id ? plant : p));
      setEditingPlant(null);
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    setPlantProfiles(prev => prev.filter(p => p.id !== plantId));
    // Désassocier les bacs qui utilisaient cette plante
    setDevices(prev => prev.map(d => d.currentPlantProfileId === plantId ? { ...d, currentPlantProfileId: undefined } : d));
    if (backendOnline) {
      try { await plantService.deletePlant(plantId); } catch { /* silently fail */ }
    }
    setDeletingPlantId(null);
  };

  const handleToggleLight = (deviceId: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isLightOn: !d.isLightOn } : d));
  };

  const handleToggleFan = (deviceId: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isFanOn: !d.isFanOn } : d));
  };

  // --- Station CRUD ---
  const handleSaveStation = (station: Station) => {
    const exists = stations.find(s => s.id === station.id);
    if (exists) {
      setStations(prev => prev.map(s => s.id === station.id ? station : s));
    } else {
      setStations(prev => [...prev, station]);
      setExpandedStationId(station.id);
    }
    setEditingStation(null);
  };

  const handleDeleteStation = (stationId: string) => {
    setStations(prev => prev.filter(s => s.id !== stationId));
    setDevices(prev => prev.map(d => d.stationId === stationId ? { ...d, stationId: undefined, bacPosition: undefined } : d));
    if (expandedStationId === stationId) setExpandedStationId(null);
  };

  // --- Bac Grid ---
  const handleBacClick = (bacId: string) => {
    if (swapSourceBacId === null) {
      setSwapSourceBacId(bacId);
    } else if (swapSourceBacId === bacId) {
      setSwapSourceBacId(null);
    } else {
      // Interchanger les plantes entre les deux bacs
      setDevices(prev => {
        const bac1 = prev.find(d => d.id === swapSourceBacId);
        const bac2 = prev.find(d => d.id === bacId);
        if (!bac1 || !bac2) return prev;
        return prev.map(d => {
          if (d.id === swapSourceBacId) return { ...d, currentPlantProfileId: bac2.currentPlantProfileId };
          if (d.id === bacId) return { ...d, currentPlantProfileId: bac1.currentPlantProfileId };
          return d;
        });
      });
      setSwapSourceBacId(null);
    }
  };

  const handleCreateBac = async (stationId: string, row: number, col: number) => {
    if (!newBacName.trim()) return;
    const name = newBacName.trim();
    setEditingBac(null);
    setNewBacName('');

    if (backendOnline) {
      try {
        const created = await deviceService.createDevice({ name, size: 'Moyen', level: 'Base', location_label: '' });
        const newBac: Device = {
          id: created.id, name: created.name, size: 'Moyen', level: 'Base',
          locationLabel: '', stationId, bacPosition: { row, col },
          isLightOn: false, isFanOn: false, createdAt: created.created_at,
          isWatering: false, automationEnabled: false,
          config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 30, phCalibrationOffset: 0 },
        };
        setDevices(prev => [...prev, newBac]);
        return;
      } catch { /* fallback local */ }
    }
    // Mode hors-ligne
    const newBac: Device = {
      id: Math.random().toString(36).substr(2, 9),
      name, size: 'Moyen', level: 'Base', locationLabel: '',
      stationId, bacPosition: { row, col },
      isLightOn: false, isFanOn: false, createdAt: new Date().toISOString(),
      isWatering: false, automationEnabled: false,
      config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 30, phCalibrationOffset: 0 },
    };
    setDevices(prev => [...prev, newBac]);
  };

  const handleDeleteBac = (bacId: string) => {
    setDevices(prev => prev.filter(d => d.id !== bacId));
    if (selectedDeviceId === bacId) setSelectedDeviceId(devices.find(d => d.id !== bacId)?.id ?? null);
  };

  // --- Styles ---
  const themeClasses = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-700';
  const cardClasses = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const sidebarClasses = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const headerClasses = isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100';
  const inputClasses = isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-none text-slate-800';

  if (page === 'landing' && !currentUser) return <Landing onNavigate={(p) => setPage(p)} />;
  if ((page === 'login' || page === 'register') && !currentUser) return <Auth type={page} onBack={() => setPage('landing')} onSuccess={handleAuthSuccess} />;
  if (!currentUser) return <Landing onNavigate={(p) => setPage(p)} />;

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${themeClasses}`}>
      {/* Botanical Sidebar */}
      <aside className={`w-24 lg:w-72 border-r flex flex-col fixed inset-y-0 z-50 transition-colors ${sidebarClasses}`}>
        <div onClick={() => setView('dashboard')} className="p-8 flex items-center gap-4 cursor-pointer group">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200 group-hover:scale-105 transition-transform">
            <i className="fas fa-leaf text-2xl"></i>
          </div>
          <span className={`text-2xl font-black hidden lg:block tracking-tighter transition-colors ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>SECOMO</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
            { id: 'plantes', icon: 'fa-seedling', label: 'Mes Plantes' },
            { id: 'alerts', icon: 'fa-bell', label: 'Alertes', badge: alerts.filter(a => !a.read).length },
            { id: 'activities', icon: 'fa-history', label: 'Activités' },
            { id: 'config', icon: 'fa-sliders', label: 'Configuration' },
            { id: 'profil', icon: 'fa-user-gear', label: 'Mon Profil' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${view === item.id ? 'bg-violet-600/10 text-violet-500 font-bold' : 'text-slate-400 hover:bg-violet-600/5'}`}
            >
              <i className={`fas ${item.icon} w-6 text-center text-xl`}></i>
              <span className="hidden lg:block">{item.label}</span>
              {item.badge ? (
                <span className="absolute right-4 w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className={`p-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div onClick={() => setView('profil')} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} mb-4`}>
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="hidden lg:block truncate">
              <p className={`text-xs font-black truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full p-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors font-bold flex items-center gap-4">
            <i className="fas fa-power-off w-6 text-center"></i>
            <span className="hidden lg:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 ml-24 lg:ml-72 overflow-y-auto">
        <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-8 py-4 flex items-center justify-between gap-6 transition-colors ${headerClasses}`}>
          {/* Gauche : titre + station */}
          <div className="flex-shrink-0">
            <h2 className={`text-3xl font-black capitalize tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{view === 'profil' ? 'Mon Profil' : view}</h2>
            <p className="text-slate-400 text-sm font-medium">
              Station: <span className="text-violet-500">{stations.find(s => s.id === selectedStationId)?.name || '—'}</span>
            </p>
          </div>

          {/* Centre : toggle AUTO/MANUEL + note (dashboard uniquement) */}
          {view === 'dashboard' && selectedDevice && (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                onClick={() => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? {
                  ...d,
                  automationEnabled: !d.automationEnabled,
                  // Passage en AUTO : éteindre ventilateur et lumière (arrosage en cours se termine)
                  ...(!d.automationEnabled ? { isFanOn: false, isLightOn: false } : {}),
                } : d))}
                className={`relative cursor-pointer rounded-2xl p-0.5 transition-all duration-300 shadow-md select-none w-44 ${
                  selectedDevice.automationEnabled
                    ? 'bg-violet-500 shadow-violet-500/30'
                    : (isDarkMode ? 'bg-slate-700' : 'bg-slate-200')
                }`}
              >
                <div className={`absolute top-0.5 bottom-0.5 w-[calc(50%-3px)] rounded-xl bg-white shadow-sm transition-all duration-300 ${
                  selectedDevice.automationEnabled ? 'left-[calc(50%+2px)]' : 'left-0.5'
                }`}></div>
                <div className="relative grid grid-cols-2 text-center">
                  <div className={`py-2 px-3 flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                    !selectedDevice.automationEnabled ? 'text-slate-700 font-black' : 'text-white/60 font-bold'
                  }`}>
                    <i className="fas fa-hand-pointer text-xs"></i>
                    <span className="text-xs uppercase tracking-wide">Manuel</span>
                  </div>
                  <div className={`py-2 px-3 flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                    selectedDevice.automationEnabled ? 'text-violet-700 font-black' : 'text-white/50 font-bold'
                  }`}>
                    <i className="fas fa-robot text-xs"></i>
                    <span className="text-xs uppercase tracking-wide">Auto</span>
                  </div>
                </div>
              </div>
              <p className={`text-[10px] text-center leading-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <i className="fas fa-circle-info mr-1"></i>
                Paramétrez l'automatisation bac par bac dans <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configuration <i className="fas fa-gear text-[9px]"></i></span>
              </p>
            </div>
          )}

          {/* Droite : sélecteur station + statut profil */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {view !== 'profil' && stations.length > 0 && (
              <select
                value={selectedStationId || ''}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className={`${inputClasses} border-none rounded-2xl px-6 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer`}
              >
                {stations.map(station => (
                  <option key={station.id} value={station.id}>
                    {station.name}{station.locationLabel ? ` — ${station.locationLabel}` : ''}
                  </option>
                ))}
              </select>
            )}
            {view === 'profil' && statusMsg && (
              <span className={`px-4 py-2 rounded-xl text-xs font-bold animate-fade-in ${statusMsg.type === 'success' ? 'bg-violet-500/10 text-violet-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {statusMsg.text}
              </span>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {view === 'dashboard' && selectedDevice && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-8">
                {/* Sélecteur de bac dans la station */}
                {(() => {
                  const stationBacs = devices.filter(d => d.stationId === selectedStationId);
                  if (stationBacs.length <= 1) return null;
                  return (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <i className="fas fa-box mr-2"></i>Bac :
                      </span>
                      {stationBacs.map(bac => (
                        <button
                          key={bac.id}
                          onClick={() => setSelectedDeviceId(bac.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedDeviceId === bac.id
                              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                              : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                          }`}
                        >
                          {bac.name}{bac.physicalId ? ' ⚡' : ''}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {/* Cartes capteurs — placeholder si pas encore de données */}
                {currentReading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SensorCard label="Temp Air" value={formatTemp(currentReading.tempAir)} unit={currentUser.unit === 'celsius' ? '°C' : '°F'} status={currentPlant ? getSensorStatus(currentReading.tempAir, currentPlant.tempMin, currentPlant.tempMax) : 'neutral'} targetRange={currentPlant ? `${formatTemp(currentPlant.tempMin).toFixed(0)}-${formatTemp(currentPlant.tempMax).toFixed(0)}°` : '—'} icon="fa-thermometer-half" isDark={isDarkMode} />
                    <SensorCard label="Humidité" value={currentReading.humidity} unit="%" status={currentPlant ? getSensorStatus(currentReading.humidity, currentPlant.humidityMin, currentPlant.humidityMax) : 'neutral'} targetRange={currentPlant ? `${currentPlant.humidityMin}-${currentPlant.humidityMax}%` : '—'} icon="fa-tint" isDark={isDarkMode} />
                    <SensorCard label="Lumière" value={currentReading.light} unit="%" status={currentPlant ? (currentReading.light < currentPlant.lightMin ? 'low' : 'ok') : 'neutral'} targetRange={currentPlant ? `Min ${currentPlant.lightMin}%` : '—'} icon="fa-sun" isDark={isDarkMode} />
                    <SensorCard label="pH Sol" value={currentReading.soilPh} unit="pH" status={currentPlant ? getSensorStatus(currentReading.soilPh, currentPlant.phMin, currentPlant.phMax) : 'neutral'} targetRange={currentPlant ? `${currentPlant.phMin}-${currentPlant.phMax}` : '—'} icon="fa-flask" isDark={isDarkMode} />
                    <SensorCard label="Batterie" value={Math.round(currentReading.batteryLevel)} unit="%" status={currentReading.batteryLevel < 20 ? 'low' : 'ok'} targetRange="Min 20%" icon="fa-battery-half" isDark={isDarkMode} />
                  </div>
                ) : (
                  <div className={`${cardClasses} p-12 rounded-[32px] border text-center space-y-4`}>
                    <i className="fas fa-satellite-dish text-4xl text-slate-300 block"></i>
                    <p className={`font-black text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>En attente des capteurs</p>
                    <p className="text-sm text-slate-400">Aucune donnée reçue pour ce bac. Connectez l'ESP32 ou attendez la prochaine mesure.</p>
                  </div>
                )}
                <HistoryChart data={history[selectedDevice.id] || []} isDark={isDarkMode} />

                {/* Contrôles Manuels — ligne horizontale sous l'historique, visible seulement en mode MANUEL */}
                {!selectedDevice.automationEnabled && (
                  <div className={`${cardClasses} rounded-[32px] border shadow-sm overflow-hidden`}>
                    <div className="px-8 py-5 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}">
                      <i className="fas fa-hand-pointer text-slate-400"></i>
                      <h3 className={`text-base font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Contrôles Manuels</h3>
                    </div>
                    <div className="px-8 py-6">
                      <div className="grid grid-cols-3 gap-6">

                        {/* 1. Arroser */}
                        <div className="space-y-3">
                          <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            <i className="fas fa-faucet-drip"></i> Arroser
                          </p>
                          {selectedDevice.isWatering ? (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                              <i className="fas fa-droplet text-blue-400 animate-bounce text-sm"></i>
                              <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                En cours ({wateringCountdown[selectedDevice.id] ?? 0} sec)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min={5} max={120} step={5}
                                value={manualDuration}
                                onChange={e => setManualDuration(Math.min(120, Math.max(5, +e.target.value)))}
                                className={`w-20 text-center rounded-xl py-2 font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
                              />
                              <span className="text-xs text-slate-400">secondes</span>
                            </div>
                          )}
                          <button
                            onClick={() => selectedDevice.isWatering ? cancelWatering(selectedDevice.id) : triggerWatering(selectedDevice.id, WateringMode.MANUAL, `Arrosage manuel ${manualDuration}s`, manualDuration)}
                            className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 ${
                              selectedDevice.isWatering
                                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                            }`}
                          >
                            <i className={`fas ${selectedDevice.isWatering ? 'fa-stop' : 'fa-faucet-drip'}`}></i>
                            {selectedDevice.isWatering ? 'Arrêter arrosage' : `Arroser ${manualDuration}s`}
                          </button>
                          {selectedDevice.lastWatering && (
                            <p className="text-[10px] text-slate-400">
                              <i className="fas fa-clock mr-1"></i>Dernier : {new Date(selectedDevice.lastWatering).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* 2. Ventilation */}
                        <div className="space-y-3">
                          <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            <i className="fas fa-wind"></i> Ventilation
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={10} max={40} step={1}
                              value={manualTargetTemp}
                              onChange={e => setManualTargetTemp(Math.min(40, Math.max(10, +e.target.value)))}
                              className={`w-20 text-center rounded-xl py-2 font-black text-sm outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
                            />
                            <span className="text-xs text-slate-400">°C cible</span>
                          </div>
                          <button
                            onClick={() => handleToggleFan(selectedDevice.id)}
                            className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 ${
                              selectedDevice.isFanOn
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                                : (isDarkMode ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400' : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600')
                            }`}
                          >
                            <i className={`fas fa-wind ${selectedDevice.isFanOn ? 'animate-spin' : ''}`} style={selectedDevice.isFanOn ? { animationDuration: '1.5s' } : {}}></i>
                            {selectedDevice.isFanOn ? `Ventilateur ON — ${manualTargetTemp}°C` : 'Ventilateur OFF'}
                          </button>
                        </div>

                        {/* 3. Lumière */}
                        <div className="space-y-3">
                          <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            <i className="fas fa-lightbulb"></i> Éclairage LED
                          </p>
                          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <i className={`fas fa-lightbulb text-xl ${selectedDevice.isLightOn ? 'text-yellow-400' : (isDarkMode ? 'text-slate-600' : 'text-slate-300')}`}></i>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedDevice.isLightOn ? 'Allumée' : 'Éteinte'}</span>
                          </div>
                          <button
                            onClick={() => handleToggleLight(selectedDevice.id)}
                            className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 ${
                              selectedDevice.isLightOn
                                ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-lg shadow-yellow-400/30'
                                : (isDarkMode ? 'bg-slate-800 hover:bg-yellow-400/10 text-slate-400 hover:text-yellow-400' : 'bg-slate-100 hover:bg-yellow-50 text-slate-500 hover:text-yellow-600')
                            }`}
                          >
                            <i className="fas fa-lightbulb"></i>
                            {selectedDevice.isLightOn ? 'Éteindre' : 'Allumer'}
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne droite */}
              <div className="space-y-8">
                <WeatherWidget isDark={isDarkMode} />
                <div className={`${cardClasses} p-8 rounded-[32px] border shadow-sm`}>
                  <h3 className={`text-lg font-black mb-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Plante Cultivée</h3>
                  {currentPlant ? (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-500 shadow-inner">
                        <i className="fas fa-seedling text-3xl"></i>
                      </div>
                      <div>
                        <p className={`font-black text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentPlant.name}</p>
                        <p className="text-xs text-slate-400 italic">"{currentPlant.notes}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-slate-200/50 rounded-2xl flex items-center justify-center text-slate-400">
                        <i className="fas fa-circle-question text-2xl"></i>
                      </div>
                      <p className="text-sm text-slate-400">Aucune plante assignée à ce bac.</p>
                    </div>
                  )}
                  <button onClick={() => setView('plantes')} className="w-full p-4 border-2 border-violet-500/20 hover:border-violet-500 hover:text-violet-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                    {currentPlant ? 'Changer de Profil' : 'Assigner une plante'}
                  </button>
                </div>

                {/* Recommandations */}
                {recommendations.length > 0 && (
                  <div className={`${cardClasses} p-6 rounded-[32px] border shadow-sm space-y-3`}>
                    <h3 className={`text-base font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Recommandations</h3>
                    {recommendations.map(rec => (
                      <div key={rec.id} className={`p-4 rounded-2xl flex items-start gap-3 ${
                        rec.severity === 'critical' ? (isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50')
                        : rec.severity === 'warning' ? (isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50')
                        : (isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50')
                      }`}>
                        <i className={`fas ${
                          rec.severity === 'critical' ? 'fa-circle-exclamation text-rose-500'
                          : rec.severity === 'warning' ? 'fa-triangle-exclamation text-amber-500'
                          : 'fa-circle-info text-blue-400'
                        } mt-0.5 flex-shrink-0`}></i>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{rec.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Mode AUTO actif (si applicable) */}
                {selectedDevice.automationEnabled && (
                  <button
                    onClick={() => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, automationEnabled: false } : d))}
                    className={`w-full px-5 py-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-colors ${isDarkMode ? 'bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20' : 'bg-violet-50 border-violet-200 hover:bg-violet-100'}`}
                  >
                    <i className="fas fa-lock text-violet-500 text-xs"></i>
                    <span className="text-xs font-bold text-violet-600">Mode AUTO actif — cliquer pour passer en manuel</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {view === 'profil' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
              {/* Left Column: Info & Security */}
              <div className="lg:col-span-2 space-y-8">
                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-violet-600 rounded-[20px] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-violet-600/20">
                       {currentUser.firstName[0]}
                     </div>
                     <div>
                       <h3 className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Informations Personnelles</h3>
                       <p className="text-slate-400 text-sm font-medium">Gérez votre identité et vos coordonnées.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prénom</label>
                      <input 
                        type="text" 
                        value={profileForm.firstName} 
                        onChange={e => setProfileForm({...profileForm, firstName: e.target.value})}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom</label>
                      <input 
                        type="text" 
                        value={profileForm.lastName} 
                        onChange={e => setProfileForm({...profileForm, lastName: e.target.value})}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`} 
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Adresse Email (Lecture seule)</label>
                      <input 
                        type="email" 
                        readOnly 
                        value={currentUser.email} 
                        className={`w-full bg-slate-100/10 cursor-not-allowed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} rounded-2xl p-4 font-bold outline-none`} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={() => updateProfile({ firstName: profileForm.firstName, lastName: profileForm.lastName })}
                      className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 active:scale-95"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                </section>

                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Sécurité du compte</h3>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mot de passe actuel</label>
                      <input 
                        type="password" 
                        value={passwordForm.current}
                        onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                        placeholder="••••••••"
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nouveau mot de passe</label>
                        <input 
                          type="password" 
                          value={passwordForm.next}
                          onChange={e => setPasswordForm({...passwordForm, next: e.target.value})}
                          placeholder="••••••••"
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Confirmation</label>
                        <input 
                          type="password" 
                          value={passwordForm.confirm}
                          onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                          placeholder="••••••••"
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit"
                        className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                      >
                        Changer le mot de passe
                      </button>
                    </div>
                  </form>
                </section>
              </div>

              {/* Right Column: Preferences */}
              <div className="space-y-8">
                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Apparence</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => updateProfile({ theme: 'light' })}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentUser.theme === 'light' ? 'border-violet-500 bg-violet-500/10' : 'border-transparent bg-slate-100/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <i className={`fas fa-sun ${currentUser.theme === 'light' ? 'text-violet-500' : 'text-slate-400'}`}></i>
                        <span className={`font-bold ${currentUser.theme === 'light' ? 'text-violet-600' : 'text-slate-500'}`}>Tech Calme (Clair)</span>
                      </div>
                      {currentUser.theme === 'light' && <i className="fas fa-check-circle text-violet-500"></i>}
                    </button>
                    <button 
                      onClick={() => updateProfile({ theme: 'dark' })}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentUser.theme === 'dark' ? 'border-violet-500 bg-violet-500/10' : 'border-transparent bg-slate-800/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <i className={`fas fa-moon ${currentUser.theme === 'dark' ? 'text-violet-500' : 'text-slate-400'}`}></i>
                        <span className={`font-bold ${currentUser.theme === 'dark' ? 'text-violet-100' : 'text-slate-500'}`}>Dark Soft (Sombre)</span>
                      </div>
                      {currentUser.theme === 'dark' && <i className="fas fa-check-circle text-violet-500"></i>}
                    </button>
                  </div>
                </section>

                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Paramètres Généraux</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Langue de l'interface</label>
                      <select 
                        value={currentUser.language}
                        onChange={e => updateProfile({ language: e.target.value as LanguageType })}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none cursor-pointer`}
                      >
                        <option value="FR">Français (France)</option>
                        <option value="EN">English (US)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unités de température</label>
                      <div className={`flex p-1 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button 
                          onClick={() => updateProfile({ unit: 'celsius' })}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${currentUser.unit === 'celsius' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400'}`}
                        >
                          Celsius (°C)
                        </button>
                        <button 
                          onClick={() => updateProfile({ unit: 'fahrenheit' })}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${currentUser.unit === 'fahrenheit' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400'}`}
                        >
                          Fahrenheit (°F)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fuseau horaire</label>
                      <input 
                        type="text" 
                        value={currentUser.timezone} 
                        readOnly
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none opacity-50 cursor-not-allowed`} 
                      />
                    </div>
                  </div>
                </section>

                <div className={`${cardClasses} p-8 rounded-[32px] border text-center opacity-60`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Informations système</p>
                  <p className="text-xs font-bold text-slate-500">Compte créé le {new Date(currentUser.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-400 mt-1">ID Utilisateur: {currentUser.id}</p>
                </div>
              </div>
            </div>
          )}

          {view === 'plantes' && (() => {
            // Palette de couleurs par station (indexée par position dans le tableau stations)
            const STATION_PALETTE = [
              { hex: '#10b981', light: '#d1fae5', border: '#10b981', text: '#059669', label: 'emerald' },
              { hex: '#3b82f6', light: '#dbeafe', border: '#3b82f6', text: '#2563eb', label: 'blue' },
              { hex: '#8b5cf6', light: '#ede9fe', border: '#8b5cf6', text: '#7c3aed', label: 'violet' },
              { hex: '#f59e0b', light: '#fef3c7', border: '#f59e0b', text: '#d97706', label: 'amber' },
              { hex: '#ec4899', light: '#fce7f3', border: '#ec4899', text: '#db2777', label: 'pink' },
              { hex: '#06b6d4', light: '#cffafe', border: '#06b6d4', text: '#0891b2', label: 'cyan' },
              { hex: '#f97316', light: '#ffedd5', border: '#f97316', text: '#ea580c', label: 'orange' },
              { hex: '#6366f1', light: '#e0e7ff', border: '#6366f1', text: '#4f46e5', label: 'indigo' },
            ];

            // Pour chaque plante : trouver les stations auxquelles elle est liée
            const getPlantStations = (plantId: string): { station: Station; colorIdx: number }[] => {
              const linkedDevices = devices.filter(d => d.currentPlantProfileId === plantId);
              const stationIds = [...new Set(linkedDevices.map(d => d.stationId).filter(Boolean))];
              return stationIds
                .map(sid => {
                  const station = stations.find(s => s.id === sid);
                  const colorIdx = stations.findIndex(s => s.id === sid) % STATION_PALETTE.length;
                  return station ? { station, colorIdx } : null;
                })
                .filter(Boolean) as { station: Station; colorIdx: number }[];
            };

            const linkedCount = plantProfiles.filter(p => devices.some(d => d.currentPlantProfileId === p.id)).length;
            const unlinkedCount = plantProfiles.length - linkedCount;

            return (
            <div className="space-y-8">
              {/* En-tête */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-slate-400 font-medium">
                    {plantProfiles.length} profil{plantProfiles.length !== 1 ? 's' : ''} au total
                    {unlinkedCount > 0 && (
                      <span className="ml-2 text-rose-400 font-bold">· {unlinkedCount} non lié{unlinkedCount > 1 ? 's' : ''}</span>
                    )}
                  </p>
                  {/* Légende stations */}
                  {stations.length > 0 && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {stations.map((station, idx) => {
                        const palette = STATION_PALETTE[idx % STATION_PALETTE.length];
                        return (
                          <span key={station.id} className="flex items-center gap-1.5 text-[10px] font-bold">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: palette.hex }}></span>
                            <span className="text-slate-400">{station.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditingPlant({ id: Math.random().toString(36).substr(2, 9), name: '', humidityMin: 50, humidityMax: 80, tempMin: 15, tempMax: 30, lightMin: 50, phMin: 6, phMax: 7, notes: '' })}
                  className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-violet-100"
                >
                  <i className="fas fa-plus"></i> Nouveau Profil
                </button>
              </div>

              {plantProfiles.length === 0 && (
                <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                  <i className="fas fa-seedling text-5xl text-slate-300 mb-6 block"></i>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Aucun profil de plante</p>
                  <p className="text-sm text-slate-400 mt-2">Créez votre premier profil de culture.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plantProfiles.map(plant => {
                  const plantStations = getPlantStations(plant.id);
                  const isUnlinked = plantStations.length === 0;
                  const colors = plantStations.map(ps => STATION_PALETTE[ps.colorIdx]);

                  // Dégradé du "wrapper" (bordure visible) : arrêts durs pour bien distinguer chaque couleur
                  const buildHardGradient = (hexColors: string[], direction = '135deg') => {
                    if (hexColors.length === 1) return hexColors[0];
                    const stops = hexColors.flatMap((hex, i) => {
                      const from = `${Math.round(i * 100 / hexColors.length)}%`;
                      const to = `${Math.round((i + 1) * 100 / hexColors.length)}%`;
                      return [`${hex} ${from}`, `${hex} ${to}`];
                    });
                    return `linear-gradient(${direction}, ${stops.join(', ')})`;
                  };

                  const wrapperBackground = isUnlinked
                    ? '#f43f5e'
                    : buildHardGradient(colors.map(c => c.hex));

                  // Fond de la carte intérieure
                  const innerBg = isDarkMode ? '#0f172a' : '#ffffff';

                  // Strip horizontal en haut (arrêts durs, bien visibles)
                  const stripBackground = colors.length > 1
                    ? buildHardGradient(colors.map(c => c.hex), 'to right')
                    : colors.length === 1 ? colors[0].hex : '';

                  return (
                    // Wrapper = "bordure dégradée" via padding + background gradient
                    <div
                      key={plant.id}
                      className="relative rounded-[32px] group transition-all hover:shadow-2xl"
                      style={{ background: wrapperBackground, padding: '2.5px' }}
                    >
                      {/* Banderole "Non lié" en diagonale — sur le wrapper */}
                      {isUnlinked && (
                        <div className="absolute top-6 -right-7 w-36 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest py-1.5 text-center transform rotate-[35deg] shadow-lg z-20 overflow-hidden">
                          Non lié
                        </div>
                      )}

                      {/* Carte intérieure */}
                      <div
                        className="relative overflow-hidden rounded-[30px]"
                        style={{ backgroundColor: isUnlinked ? (isDarkMode ? '#1e0a0a' : '#fff5f5') : innerBg }}
                      >
                        {/* Strip de couleur station(s) en haut — arrêts durs bien visibles */}
                        {!isUnlinked && colors.length > 0 && (
                          <div className="h-2.5 w-full" style={{ background: stripBackground }}></div>
                        )}

                      <div className="p-8">
                        {/* Header : icône + boutons */}
                        <div className="flex justify-between items-start mb-6">
                          <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                            style={isUnlinked
                              ? { backgroundColor: '#fee2e2', color: '#ef4444' }
                              : colors.length === 1
                              ? { backgroundColor: `${colors[0].hex}22`, color: colors[0].text }
                              : { background: buildHardGradient(colors.map(c => c.hex + '44'), '135deg'), color: colors[0].text }
                            }
                          >
                            <i className="fas fa-leaf text-2xl"></i>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingPlant(plant)} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-violet-500' : 'bg-slate-100 text-slate-400 hover:text-violet-600'}`}><i className="fas fa-edit"></i></button>
                            <button onClick={() => setDeletingPlantId(plant.id)} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-rose-500' : 'bg-slate-100 text-slate-400 hover:text-rose-500'}`}><i className="fas fa-trash"></i></button>
                          </div>
                        </div>

                        <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{plant.name}</h3>
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2 h-10">{plant.notes || <span className="italic">Aucune note</span>}</p>

                        {/* Badges des stations liées */}
                        {isUnlinked ? (
                          <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-4">
                            <i className="fas fa-unlink"></i> Non assignée à un bac
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {plantStations.map(ps => {
                              const palette = STATION_PALETTE[ps.colorIdx];
                              return (
                                <span
                                  key={ps.station.id}
                                  className="text-[10px] font-black px-2.5 py-1 rounded-xl"
                                  style={{ backgroundColor: `${palette.hex}20`, color: palette.text }}
                                >
                                  <i className="fas fa-layer-group mr-1"></i>{ps.station.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (selectedDeviceId) {
                              setDevices(prev => prev.map(d => d.id === selectedDeviceId ? { ...d, currentPlantProfileId: plant.id } : d));
                              setView('dashboard');
                            }
                          }}
                          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${
                            isUnlinked
                              ? (isDarkMode ? 'bg-rose-500/20 hover:bg-violet-600 text-rose-300 hover:text-white' : 'bg-rose-100 hover:bg-violet-600 text-rose-500 hover:text-white')
                              : (isDarkMode ? 'bg-slate-800 hover:bg-violet-600 text-slate-100' : 'bg-slate-100 hover:bg-violet-600 hover:text-white text-slate-600')
                          }`}
                        >
                          Appliquer au bac sélectionné
                        </button>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {view === 'config' && (() => {
            const GRID_ROWS = 3;
            const GRID_COLS = 4;
            const plantsWithoutBac = plantProfiles.filter(p => !devices.some(d => d.currentPlantProfileId === p.id));

            return (
            <div className="space-y-8">
              {/* En-tête */}
              <div className="flex justify-between items-center">
                <p className="text-slate-400 font-medium">Gérez vos stations et positionnez vos bacs sur la grille.</p>
                <button
                  onClick={() => setEditingStation({ id: Math.random().toString(36).substr(2, 9), name: '', locationLabel: '', createdAt: new Date().toISOString() })}
                  className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-violet-100"
                >
                  <i className="fas fa-plus"></i> Nouvelle station
                </button>
              </div>

              {/* Alerte plantes sans bac */}
              {plantsWithoutBac.length > 0 && (
                <div className={`p-5 rounded-2xl border-2 border-rose-400/40 ${isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50'} flex items-start gap-3`}>
                  <i className="fas fa-circle-exclamation text-rose-500 mt-0.5"></i>
                  <div>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>Plantes sans bac assigné</p>
                    <p className="text-xs text-rose-400 mt-1">
                      {plantsWithoutBac.map(p => p.name).join(', ')} — Placez-les dans un bac via la grille ci-dessous.
                    </p>
                  </div>
                </div>
              )}

              {/* Liste des stations */}
              {stations.length === 0 && (
                <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                  <i className="fas fa-layer-group text-5xl text-slate-300 mb-6 block"></i>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Aucune station</p>
                  <p className="text-sm text-slate-400 mt-2">Créez une station pour organiser vos bacs.</p>
                </div>
              )}

              {stations.map(station => {
                const stationBacs = devices.filter(d => d.stationId === station.id);
                const isExpanded = expandedStationId === station.id;

                return (
                  <div key={station.id} className={`${cardClasses} rounded-[32px] border shadow-sm overflow-hidden`}>
                    {/* En-tête station */}
                    <div
                      className={`p-8 flex items-center justify-between cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                      onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
                          <i className="fas fa-layer-group"></i>
                        </div>
                        <div>
                          <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{station.name || 'Station sans nom'}</h3>
                          <p className="text-sm text-slate-400"><i className="fas fa-location-dot mr-1"></i>{station.locationLabel || 'Emplacement non défini'} · {stationBacs.length} bac{stationBacs.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={e => { e.stopPropagation(); setEditingStation(station); }} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-violet-400' : 'hover:bg-slate-100 text-slate-400 hover:text-violet-600'}`}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteStation(station.id); }} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400' : 'hover:bg-rose-50 text-slate-400 hover:text-rose-500'}`}>
                          <i className="fas fa-trash"></i>
                        </button>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400 ml-2`}></i>
                      </div>
                    </div>

                    {/* Grille bacs */}
                    {isExpanded && (
                      <div className={`px-8 pb-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className="pt-6 space-y-4">
                          {/* Note d'aide */}
                          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium ${isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                            <i className="fas fa-circle-info flex-shrink-0"></i>
                            <span>
                              Survolez un bac pour accéder à son icône <i className="fas fa-gear mx-1"></i><strong>Paramètres</strong> — automatisation (arrosage, ventilation, éclairage), taille du bac, fréquence de mesure.
                            </span>
                          </div>
                          {swapSourceBacId && (
                            <p className="text-xs font-bold text-amber-500 flex items-center gap-2">
                              <i className="fas fa-arrows-rotate"></i>
                              Bac sélectionné : <span className="text-amber-400">{devices.find(d => d.id === swapSourceBacId)?.name}</span> — Cliquez sur un autre bac pour interchanger leurs plantes
                              <button onClick={() => setSwapSourceBacId(null)} className="ml-2 text-slate-400 hover:text-slate-200"><i className="fas fa-times"></i></button>
                            </p>
                          )}
                          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
                            {Array.from({ length: GRID_ROWS }, (_, row) =>
                              Array.from({ length: GRID_COLS }, (_, col) => {
                                const bac = stationBacs.find(d => d.bacPosition?.row === row && d.bacPosition?.col === col);
                                const plant = bac ? plantProfiles.find(p => p.id === bac.currentPlantProfileId) : null;
                                const isSelected = bac?.id === swapSourceBacId;
                                const hasNoPlant = bac && !plant;

                                if (bac) {
                                  return (
                                    <div
                                      key={`${row}-${col}`}
                                      onClick={() => handleBacClick(bac.id)}
                                      className={`relative min-h-[90px] p-3 rounded-2xl border-2 cursor-pointer transition-all group ${
                                        isSelected
                                          ? 'border-amber-400 bg-amber-400/10 scale-105'
                                          : hasNoPlant
                                          ? 'border-rose-400/60 bg-rose-500/10 animate-pulse'
                                          : (isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-violet-500/50' : 'border-slate-200 bg-slate-50 hover:border-violet-400')
                                      }`}
                                    >
                                      <p className={`text-[10px] font-black uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{bac.name}</p>
                                      {plant ? (
                                        <p className="text-[10px] text-violet-500 font-bold mt-1 truncate flex items-center gap-1"><i className="fas fa-seedling"></i>{plant.name}</p>
                                      ) : (
                                        <p className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1"><i className="fas fa-exclamation-circle"></i>Aucune plante</p>
                                      )}
                                      {/* Assign plant dropdown */}
                                      <select
                                        value={bac.currentPlantProfileId || ''}
                                        onChange={e => { e.stopPropagation(); setDevices(prev => prev.map(d => d.id === bac.id ? { ...d, currentPlantProfileId: e.target.value || undefined } : d)); }}
                                        onClick={e => e.stopPropagation()}
                                        className={`mt-2 w-full text-[9px] rounded-lg p-1 font-bold outline-none cursor-pointer border-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'}`}
                                      >
                                        <option value="">— Aucune plante —</option>
                                        {plantProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                      <div className="absolute top-2 right-2 flex gap-1">
                                        <button onClick={e => { e.stopPropagation(); setConfiguringBacId(bac.id); }} className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] opacity-40 group-hover:opacity-100 hover:bg-blue-500/40 transition-all" title="Paramètres du bac"><i className="fas fa-gear"></i></button>
                                        <button onClick={e => { e.stopPropagation(); handleDeleteBac(bac.id); }} className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 hover:bg-rose-500/40 transition-all"><i className="fas fa-times"></i></button>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={`${row}-${col}`}
                                    onClick={() => { setEditingBac({ stationId: station.id, row, col }); setNewBacName(''); }}
                                    className={`min-h-[90px] p-3 rounded-2xl border-2 border-dashed cursor-pointer flex items-center justify-center transition-all ${isDarkMode ? 'border-slate-700 hover:border-violet-500/50 hover:bg-violet-500/5' : 'border-slate-200 hover:border-violet-400 hover:bg-violet-50'}`}
                                  >
                                    <i className="fas fa-plus text-slate-300 text-lg"></i>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
            );
          })()}

          {view === 'activities' && (() => {
            // Trier les événements par date décroissante et dédupliquer
            const uniqueEvents = wateringEvents
              .filter((e, idx, arr) => arr.findIndex(x => x.id === e.id) === idx)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 font-medium">
                  Historique des arrosages sur toutes vos stations.
                  {uniqueEvents.length > 0 && ` · ${uniqueEvents.length} événement${uniqueEvents.length > 1 ? 's' : ''}`}
                </p>
              </div>

              {uniqueEvents.length === 0 ? (
                <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                  <i className="fas fa-history text-5xl text-slate-300 mb-6 block"></i>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Aucune activité</p>
                  <p className="text-sm text-slate-400 mt-2">Les arrosages et événements apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uniqueEvents.map((event, idx) => {
                    const deviceInfo = devices.find(d => d.id === event.deviceId);
                    const stationInfo = stations.find(s => s.id === deviceInfo?.stationId);
                    const isAuto = event.mode === WateringMode.AUTO;
                    return (
                      <div key={`${event.id}-${idx}`} className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAuto
                              ? (isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600')
                              : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
                          }`}>
                            <i className={`fas ${isAuto ? 'fa-robot' : 'fa-hand-pointer'} text-sm`}></i>
                          </div>
                          {idx < uniqueEvents.length - 1 && (
                            <div className={`w-0.5 flex-1 mt-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                          )}
                        </div>

                        {/* Event card */}
                        <div className={`${cardClasses} flex-1 p-6 rounded-2xl border mb-2`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-xs font-black uppercase tracking-wider ${isAuto ? 'text-violet-500' : 'text-blue-500'}`}>
                                {isAuto ? 'AUTO' : 'MANUEL'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                <i className="fas fa-microchip mr-1"></i>{deviceInfo?.name || 'Bac inconnu'}
                              </span>
                              {stationInfo && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                                  <i className="fas fa-layer-group mr-1"></i>{stationInfo.name}
                                </span>
                              )}
                            </div>
                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              <i className="fas fa-stopwatch mr-1 text-xs"></i>{event.durationSec}s
                            </span>
                          </div>
                          {event.reason && (
                            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{event.reason}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-2">
                            <i className="fas fa-clock mr-1"></i>{new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}

          {view === 'alerts' && (() => {
            const alertIcon = (type: AlertType) => {
              if (type === 'critical') return 'fa-circle-exclamation text-rose-500';
              if (type === 'warning') return 'fa-triangle-exclamation text-amber-500';
              return 'fa-circle-info text-blue-400';
            };
            const alertBg = (type: AlertType) => {
              if (type === 'critical') return isDarkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200';
              if (type === 'warning') return isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200';
              return isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200';
            };
            const categoryIcon = (cat: AlertCategory) => {
              if (cat === 'humidity') return 'fa-tint';
              if (cat === 'temperature') return 'fa-thermometer-half';
              if (cat === 'ph') return 'fa-flask';
              return 'fa-sun';
            };

            // Clic sur une alerte → redirection + marquer comme lue
            const handleAlertClick = (alert: Alert) => {
              // Marquer comme lue
              setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
              const device = devices.find(d => d.id === alert.deviceId);
              if (device?.stationId) setSelectedStationId(device.stationId);
              setSelectedDeviceId(alert.deviceId);
              const plant = plantProfiles.find(p => p.name === alert.plantName);
              if (plant && device?.currentPlantProfileId !== plant.id) {
                setDevices(prev => prev.map(d =>
                  d.id === alert.deviceId ? { ...d, currentPlantProfileId: plant.id } : d
                ));
              }
              setView('dashboard');
            };

            // Supprimer une alerte individuelle
            const handleDeleteAlert = (e: React.MouseEvent, alertId: string) => {
              e.stopPropagation();
              setAlerts(prev => prev.filter(a => a.id !== alertId));
            };

            // Marquer toutes comme lues
            const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, read: true })));

            const unreadCount = alerts.filter(a => !a.read).length;

            // Grouper les alertes par station (toutes les stations affichées)
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            const alertsByStation: Record<string, { station: Station | null; deviceGroups: Record<string, Alert[]> }> = {};
            alerts.forEach(a => {
              const device = devices.find(d => d.id === a.deviceId);
              const stationId = device?.stationId || '__none__';
              if (!alertsByStation[stationId]) {
                alertsByStation[stationId] = {
                  station: stations.find(s => s.id === stationId) || null,
                  deviceGroups: {},
                };
              }
              if (!alertsByStation[stationId].deviceGroups[a.deviceId]) {
                alertsByStation[stationId].deviceGroups[a.deviceId] = [];
              }
              alertsByStation[stationId].deviceGroups[a.deviceId].push(a);
            });
            // Trier les alertes de chaque device
            Object.values(alertsByStation).forEach(stationGroup =>
              Object.values(stationGroup.deviceGroups).forEach(group =>
                group.sort((a, b) => severityOrder[a.type] - severityOrder[b.type] || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              )
            );
            const totalStationsWithAlerts = Object.keys(alertsByStation).length;

            return (
              <div className="space-y-6">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <p className="text-slate-400 font-medium">
                    {alerts.length > 0
                      ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} · ${unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'toutes lues'} · ${totalStationsWithAlerts} station${totalStationsWithAlerts > 1 ? 's' : ''}`
                      : 'Aucune alerte active'}
                  </p>
                  {alerts.length > 0 && (
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-blue-400 hover:bg-blue-500/20' : 'bg-slate-100 text-blue-600 hover:bg-blue-50'}`}
                        >
                          <i className="fas fa-check-double mr-1.5"></i>Tout marquer lu
                        </button>
                      )}
                      <button
                        onClick={() => setAlerts([])}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-100 text-rose-500 hover:bg-rose-50'}`}
                      >
                        <i className="fas fa-trash mr-1.5"></i>Tout effacer
                      </button>
                    </div>
                  )}
                </div>

                {alerts.length === 0 ? (
                  <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                    <i className="fas fa-check-circle text-5xl text-emerald-400 mb-6 block"></i>
                    <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tout va bien</p>
                    <p className="text-sm text-slate-400 mt-2">Aucune alerte active. Toutes vos plantes sont dans les seuils.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(alertsByStation).map(([stationId, { station, deviceGroups }]) => {
                      const stationAlertCount = Object.values(deviceGroups).reduce((sum, g) => sum + g.length, 0);
                      return (
                        <div key={stationId}>
                          {/* En-tête station */}
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
                              <i className="fas fa-layer-group text-sm"></i>
                            </div>
                            <div>
                              <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {station?.name || 'Station inconnue'}
                              </h3>
                              {station?.locationLabel && (
                                <p className="text-xs text-slate-400"><i className="fas fa-location-dot mr-1"></i>{station.locationLabel}</p>
                              )}
                            </div>
                            <span className={`ml-auto text-[10px] font-bold px-3 py-1 rounded-xl ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
                              {stationAlertCount} alerte{stationAlertCount > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Groupes par device/bac */}
                          <div className="space-y-6 pl-4 border-l-2 border-violet-600/20 ml-4">
                            {Object.entries(deviceGroups).map(([deviceId, deviceAlerts]) => {
                              const deviceInfo = devices.find(d => d.id === deviceId);
                              return (
                                <div key={deviceId}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                      <i className={`fas fa-microchip text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}></i>
                                    </div>
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                      {deviceInfo?.name || 'Bac inconnu'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                      {deviceAlerts.length} alerte{deviceAlerts.length > 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    {deviceAlerts.map(alert => (
                                      <div
                                        key={alert.id}
                                        onClick={() => handleAlertClick(alert)}
                                        className={`${alertBg(alert.type)} border rounded-2xl p-5 flex items-start gap-4 cursor-pointer transition-all hover:scale-[1.005] hover:shadow-lg group ${alert.read ? 'opacity-60' : ''}`}
                                      >
                                        {/* Indicateur non lu */}
                                        <div className="pt-0.5 flex flex-col items-center gap-2">
                                          <i className={`fas ${alertIcon(alert.type)} text-lg`}></i>
                                          {!alert.read && (
                                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <span className={`text-xs font-black uppercase tracking-wider ${
                                              alert.type === 'critical' ? 'text-rose-500'
                                              : alert.type === 'warning' ? 'text-amber-500'
                                              : 'text-blue-400'
                                            }`}>
                                              {alert.type}
                                            </span>
                                            {!alert.read && (
                                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 px-1.5 py-0.5 rounded-md bg-rose-500/10">Nouveau</span>
                                            )}
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-violet-900/40 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                                              <i className="fas fa-seedling mr-1"></i>{alert.plantName}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/70 text-slate-500'}`}>
                                              <i className={`fas ${categoryIcon(alert.category)} mr-1`}></i>{alert.category}
                                            </span>
                                          </div>
                                          <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{alert.message}</p>
                                          <div className="flex items-center justify-between mt-2">
                                            <p className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleString()}</p>
                                            <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                                              <i className="fas fa-arrow-right"></i>Voir le dashboard
                                            </span>
                                          </div>
                                        </div>
                                        {/* Bouton supprimer */}
                                        <button
                                          onClick={(e) => handleDeleteAlert(e, alert.id)}
                                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-rose-500/20 flex-shrink-0 ${isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'}`}
                                          title="Supprimer cette alerte"
                                        >
                                          <i className="fas fa-xmark text-sm"></i>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </main>

      {/* Modal confirmation suppression plante */}
      {deletingPlantId && (() => {
        const plant = plantProfiles.find(p => p.id === deletingPlantId);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeletingPlantId(null)}>
            <div className={`w-full max-w-sm mx-4 ${cardClasses} rounded-[32px] border shadow-2xl p-10 space-y-6`} onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto"><i className="fas fa-trash text-rose-500 text-2xl"></i></div>
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Supprimer la plante ?</h3>
                <p className="text-sm text-slate-400">"{plant?.name}" sera supprimée et désassociée de tous les bacs.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setDeletingPlantId(null)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Annuler</button>
                <button onClick={() => handleDeletePlant(deletingPlantId)} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-rose-500/20">Supprimer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal édition / création station */}
      {editingStation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingStation(null)}>
          <div className={`w-full max-w-md mx-4 ${cardClasses} rounded-[32px] border shadow-2xl p-10 space-y-6`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              {stations.find(s => s.id === editingStation.id) ? 'Modifier la station' : 'Nouvelle station'}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom de la station</label>
                <input type="text" value={editingStation.name} onChange={e => setEditingStation({ ...editingStation, name: e.target.value })} placeholder="Ex: Station Jardin" className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Emplacement</label>
                <input type="text" value={editingStation.locationLabel} onChange={e => setEditingStation({ ...editingStation, locationLabel: e.target.value })} placeholder="Ex: Jardin, Balcon, Serre..." className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button onClick={() => setEditingStation(null)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Annuler</button>
              <button onClick={() => { if (editingStation.name.trim()) handleSaveStation(editingStation); }} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-violet-600/20">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal configuration d'un bac (engrenage) */}
      {configuringBacId && (() => {
        const bac = devices.find(d => d.id === configuringBacId);
        if (!bac) return null;
        const update = (patch: Partial<Device>) => setDevices(prev => prev.map(d => d.id === bac.id ? { ...d, ...patch } : d));
        const updateCfg = (patch: Partial<typeof bac.config>) => setDevices(prev => prev.map(d => d.id === bac.id ? { ...d, config: { ...d.config, ...patch } } : d));
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfiguringBacId(null)}>
            <div className={`w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto ${cardClasses} rounded-[32px] border shadow-2xl p-10 space-y-6`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  <i className="fas fa-gear mr-2 text-blue-500"></i>{bac.name}
                </h3>
                <button onClick={() => setConfiguringBacId(null)} className="text-slate-400 hover:text-slate-200"><i className="fas fa-times"></i></button>
              </div>

              {/* Infos bac */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom</label>
                  <input type="text" value={bac.name} onChange={e => update({ name: e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-3 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Taille</label>
                    <select value={bac.size} onChange={e => update({ size: e.target.value as any })} className={`w-full ${inputClasses} rounded-2xl p-3 font-bold outline-none cursor-pointer`}>
                      <option value="Petit">Petit (~5L)</option><option value="Moyen">Moyen (~15L)</option><option value="Grand">Grand (~40L)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mesures</label>
                    <select value={bac.config.samplingFrequencySec} onChange={e => updateCfg({ samplingFrequencySec: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-3 font-bold outline-none cursor-pointer`}>
                      <option value={5}>5 sec</option><option value={10}>10 sec</option><option value={30}>30 sec</option><option value={60}>1 min</option>
                    </select>
                  </div>
                </div>
                {bac.physicalId && (
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                    <i className="fas fa-link text-violet-500 text-xs"></i>
                    <p className={`text-[10px] font-mono truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{bac.physicalId}</p>
                  </div>
                )}
              </div>

              {/* Automatisation */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Automatisation</p>
                {[
                  { key: 'automationEnabled', label: 'Arrosage automatique', desc: 'Arrose quand le sol est trop sec', icon: 'fa-faucet-drip', color: 'bg-blue-500', isDevice: true },
                  { key: 'autoVentilation', label: 'Ventilation automatique', desc: 'Active le ventilateur si temp. hors plage', icon: 'fa-wind', color: 'bg-amber-500', isDevice: false },
                  { key: 'autoLighting', label: 'Éclairage automatique', desc: 'Active les LEDs si lumière insuffisante', icon: 'fa-lightbulb', color: 'bg-yellow-500', isDevice: false },
                ].map(opt => {
                  const val = opt.isDevice ? (bac as any)[opt.key] : (bac.config as any)[opt.key];
                  const toggle = () => opt.isDevice ? update({ [opt.key]: !val } as any) : updateCfg({ [opt.key]: !val } as any);
                  return (
                    <div key={opt.key} className={`flex items-center justify-between p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <i className={`fas ${opt.icon} w-4 text-center text-sm ${val ? opt.color.replace('bg-', 'text-') : 'text-slate-400'}`}></i>
                        <div>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{opt.label}</p>
                          <p className="text-[10px] text-slate-400">{opt.desc}</p>
                        </div>
                      </div>
                      <button onClick={toggle} className={`relative w-12 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${val ? opt.color : (isDarkMode ? 'bg-slate-700' : 'bg-slate-300')}`}>
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${val ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setConfiguringBacId(null)} className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-widest">Fermer</button>
            </div>
          </div>
        );
      })()}

      {/* Modal nouveau bac dans la grille */}
      {editingBac && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setEditingBac(null); setNewBacName(''); setNewBacPhysicalId(''); }}>
          <div className={`w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto ${cardClasses} rounded-[32px] border shadow-2xl p-10 space-y-6`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <i className="fas fa-box mr-2 text-violet-500"></i>Nouveau bac
            </h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom du bac</label>
              <input
                type="text" value={newBacName} onChange={e => setNewBacName(e.target.value)}
                placeholder="Ex: Bac Tomates" autoFocus
                className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`}
              />
            </div>

            {/* Lien physique QR / manuel */}
            {newBacPhysicalId ? (
              <div className={`p-4 rounded-2xl flex items-center gap-3 ${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                <i className="fas fa-link text-violet-500"></i>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-violet-500">Bac physique lié</p>
                  <p className={`text-[10px] font-mono truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{newBacPhysicalId}</p>
                </div>
                <button onClick={() => setNewBacPhysicalId('')} className="text-slate-400 hover:text-rose-400 text-xs"><i className="fas fa-times"></i></button>
              </div>
            ) : (
              <QRScanner isDark={isDarkMode} onCode={code => setNewBacPhysicalId(code)} />
            )}

            <div className="flex gap-4 pt-2">
              <button onClick={() => { setEditingBac(null); setNewBacName(''); setNewBacPhysicalId(''); }} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Annuler</button>
              <button
                onClick={() => {
                  if (!newBacName.trim()) return;
                  const newBac: Device = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: newBacName.trim(),
                    size: 'Moyen', level: 'Base', locationLabel: '',
                    stationId: editingBac.stationId,
                    bacPosition: { row: editingBac.row, col: editingBac.col },
                    physicalId: newBacPhysicalId || undefined,
                    isLightOn: false, isFanOn: false,
                    createdAt: new Date().toISOString(),
                    isWatering: false, automationEnabled: false,
                    config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 30, phCalibrationOffset: 0 },
                  };
                  setDevices(prev => [...prev, newBac]);
                  setEditingBac(null); setNewBacName(''); setNewBacPhysicalId('');
                }}
                disabled={!newBacName.trim()}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-violet-600/20"
              >
                Créer le bac
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition / création plante */}
      {editingPlant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingPlant(null)}>
          <div
            className={`w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto ${cardClasses} rounded-[32px] border shadow-2xl p-10 space-y-6`}
            onClick={e => e.stopPropagation()}
          >
            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              {plantProfiles.find(p => p.id === editingPlant.id) ? 'Modifier le profil' : 'Nouveau profil de plante'}
            </h3>

            {/* Recherche dans le catalogue (5500+ plantes) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                <i className="fas fa-search mr-1"></i> Rechercher une plante dans le catalogue (5500+ espèces)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Ex: Rosa, Lavandula, Mentha, Solanum..."
                  className={`w-full ${inputClasses} rounded-2xl p-4 pl-11 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                />
                <i className={`fas ${catalogLoading ? 'fa-spinner fa-spin' : 'fa-leaf'} absolute left-4 top-1/2 -translate-y-1/2 text-slate-400`}></i>
              </div>
              {catalogResults.length > 0 && (
                <div className={`rounded-2xl border overflow-hidden max-h-56 overflow-y-auto ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {catalogResults.map((cp: any, i: number) => {
                    const commonName = cp.common_names?.[userLang]?.[0] || cp.common_names?.fr?.[0] || cp.common_names?.en?.[0] || '';
                    return (
                    <button
                      key={cp.pid + i}
                      onClick={() => applyCatalogPlant(cp)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${isDarkMode ? 'hover:bg-violet-600/20' : 'hover:bg-violet-50'} ${i > 0 ? (isDarkMode ? 'border-t border-slate-700' : 'border-t border-slate-100') : ''}`}
                    >
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {commonName ? <>{commonName} <span className="font-normal italic text-slate-400 text-xs">({cp.name})</span></> : cp.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{cp.category}{cp.origin ? ` — ${cp.origin}` : ''}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-slate-400">{cp.temp_min}–{cp.temp_max}°C</p>
                        <p className="text-[10px] text-violet-500 font-bold">Hum {cp.humidity_min}–{cp.humidity_max}%</p>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
              {catalogSearch.length >= 2 && catalogResults.length === 0 && !catalogLoading && (
                <p className={`text-xs ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Aucun résultat. Vous pouvez remplir les champs manuellement ci-dessous.
                </p>
              )}
              {catalogSearch.length < 2 && (
                <p className={`text-xs italic ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tapez au moins 2 caractères pour rechercher. Les valeurs seront pré-remplies automatiquement.
                </p>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom de la plante</label>
                <input
                  type="text"
                  value={editingPlant.name}
                  onChange={e => setEditingPlant({ ...editingPlant, name: e.target.value })}
                  placeholder="Ex: Basilic Grand Vert"
                  className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                />
              </div>

              {/* Humidité du sol */}
              <div className="space-y-2">
                <div className="relative inline-block ml-1">
                  <button
                    type="button"
                    className="flex items-center gap-2 group cursor-help"
                    onClick={() => setOpenTooltip(openTooltip === 'humidity' ? null : 'humidity')}
                    onMouseEnter={() => setOpenTooltip('humidity')}
                    onMouseLeave={() => setOpenTooltip(prev => prev === 'humidity' ? null : prev)}
                  >
                    <i className="fas fa-tint text-blue-400 text-xs"></i>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Humidité du sol (%)</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'humidity' ? 'text-violet-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'humidity' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      Le taux d'eau dans la terre. <strong>0%</strong> = terre complètement sèche, <strong>100%</strong> = saturée d'eau. La plupart des plantes poussent bien entre <strong>40% et 70%</strong>.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Minimum</span>
                    <input type="number" min="0" max="100" value={editingPlant.humidityMin} onChange={e => setEditingPlant({ ...editingPlant, humidityMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Maximum</span>
                    <input type="number" min="0" max="100" value={editingPlant.humidityMax} onChange={e => setEditingPlant({ ...editingPlant, humidityMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                  </div>
                </div>
              </div>

              {/* Température */}
              <div className="space-y-2">
                <div className="relative inline-block ml-1">
                  <button
                    type="button"
                    className="flex items-center gap-2 group cursor-help"
                    onClick={() => setOpenTooltip(openTooltip === 'temp' ? null : 'temp')}
                    onMouseEnter={() => setOpenTooltip('temp')}
                    onMouseLeave={() => setOpenTooltip(prev => prev === 'temp' ? null : prev)}
                  >
                    <i className="fas fa-thermometer-half text-amber-400 text-xs"></i>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Température (°C)</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'temp' ? 'text-violet-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'temp' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      Plage de température tolérée. En dessous du min ou au-dessus du max, la croissance ralentit ou la plante souffre. <strong>Intérieur classique : 18-25°C</strong>.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Minimum</span>
                    <input type="number" value={editingPlant.tempMin} onChange={e => setEditingPlant({ ...editingPlant, tempMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Maximum</span>
                    <input type="number" value={editingPlant.tempMax} onChange={e => setEditingPlant({ ...editingPlant, tempMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                  </div>
                </div>
              </div>

              {/* Lumière */}
              <div className="space-y-2">
                <div className="relative inline-block ml-1">
                  <button
                    type="button"
                    className="flex items-center gap-2 group cursor-help"
                    onClick={() => setOpenTooltip(openTooltip === 'light' ? null : 'light')}
                    onMouseEnter={() => setOpenTooltip('light')}
                    onMouseLeave={() => setOpenTooltip(prev => prev === 'light' ? null : prev)}
                  >
                    <i className="fas fa-sun text-yellow-400 text-xs"></i>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Lumière minimum (%)</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'light' ? 'text-violet-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'light' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      Intensité lumineuse minimale. <strong>30-40%</strong> = mi-ombre (salades, menthe), <strong>60-80%</strong> = plein soleil (tomates, piments). En dessous, les LEDs horticoles s'activeront automatiquement.
                    </div>
                  )}
                </div>
                <input type="number" min="0" max="100" value={editingPlant.lightMin} onChange={e => setEditingPlant({ ...editingPlant, lightMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
              </div>

              {/* pH */}
              <div className="space-y-2">
                <div className="relative inline-block ml-1">
                  <button
                    type="button"
                    className="flex items-center gap-2 group cursor-help"
                    onClick={() => setOpenTooltip(openTooltip === 'ph' ? null : 'ph')}
                    onMouseEnter={() => setOpenTooltip('ph')}
                    onMouseLeave={() => setOpenTooltip(prev => prev === 'ph' ? null : prev)}
                  >
                    <i className="fas fa-flask text-violet-400 text-xs"></i>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">pH du sol</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'ph' ? 'text-violet-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'ph' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      Acidité du sol, de 0 (très acide) à 14 (très basique). <strong>Potager classique : 6.0 - 7.0</strong> (légèrement acide à neutre). Fraises et myrtilles préfèrent un sol plus acide (5.0 - 6.0).
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Minimum</span>
                    <input type="number" step="0.1" min="0" max="14" value={editingPlant.phMin} onChange={e => setEditingPlant({ ...editingPlant, phMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Maximum</span>
                    <input type="number" step="0.1" min="0" max="14" value={editingPlant.phMax} onChange={e => setEditingPlant({ ...editingPlant, phMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500`} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Notes / Description</label>
                <textarea
                  value={editingPlant.notes}
                  onChange={e => setEditingPlant({ ...editingPlant, notes: e.target.value })}
                  rows={3}
                  placeholder="Conseils de culture, particularités..."
                  className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-violet-500 resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setEditingPlant(null)}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Annuler
              </button>
              <button
                onClick={() => { if (editingPlant.name.trim()) handlePlantSave(editingPlant); }}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 active:scale-95"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
