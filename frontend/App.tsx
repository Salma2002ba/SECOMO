
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
import WaterTankCard from './components/WaterTankCard';

// --- API Services ---
import * as authService from './services/auth.service';
import * as deviceService from './services/device.service';
import * as plantService from './services/plant.service';
import * as sensorService from './services/sensor.service';
import * as wateringService from './services/watering.service';
import * as stationService from './services/station.service';
import { getAccessToken } from './services/api';
import { wsService } from './services/ws.service';
import { t, type Lang, alertMsg, recMsg, translatePlantName } from './i18n';

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
    id: d.id, name: d.name, apiKey: d.api_key, size: d.size as any, level: d.level as any,
    locationLabel: d.location_label, createdAt: d.created_at,
    isWatering: false, automationEnabled: d.automation_enabled,
    isLightOn: false, isFanOn: false, fanSpeed: 0,
    stationId: d.station_id || undefined,
    bacPosition: (d.bac_row != null && d.bac_col != null) ? { row: d.bac_row, col: d.bac_col } : undefined,
    config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 10, phCalibrationOffset: 0, tankCapacityLiters: 20, flowRateLitersPerMin: 0.5, soilVolumeLiters: 15, volumeM3: 0.5 },
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
    batteryLevel: r.battery_level ?? 85,
    waterTankLevel: r.water_tank_level ?? 80,
  };
}

// --- SwipeSlider : glisser pour ajuster une valeur ---
const SwipeSlider: React.FC<{
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
  unit: string; label: string; color: string; isDark: boolean; lang?: Lang;
}> = ({ value, min, max, step = 1, onChange, unit, label, color, isDark, lang = 'FR' as Lang }) => {
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
        <div className={`h-full transition-none ${color.includes('blue') ? 'bg-blue-600' : color.includes('amber') ? 'bg-amber-500' : 'bg-green-600'}`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <i className="fas fa-arrows-left-right text-white/60 text-xs"></i>
          <span className="text-xs font-bold text-white/70">{t('dash_slider_drag', lang)}</span>
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
    currentPlantProfileId?: string;
  }>;
  stationGrids?: Record<string, { rows: number; cols: number }>;
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
const SIM_BASES: Record<string, { tempAir: number; humidity: number; light: number; soilPh: number; waterTankLevel: number }> = {
  'dev-001': { tempAir: 31, humidity: 48, light: 55, soilPh: 6.3, waterTankLevel: 75 }, // Basilic : temp haute + humidité basse
  'dev-002': { tempAir: 20, humidity: 58, light: 38, soilPh: 6.5, waterTankLevel: 45 }, // Menthe : humidité basse + lumière basse
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
  const lastAutoWateringRef = useRef<Record<string, number>>({});
  const runAutoModeRef = useRef<(reading: SensorReading, device: Device) => void>(() => {});

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
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const lang: Lang = currentUser?.language ?? 'FR';

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
      // 1. Tenter de joindre le backend
      let apiDevices: Awaited<ReturnType<typeof deviceService.getDevices>> = [];
      let apiPlants: Awaited<ReturnType<typeof plantService.getPlants>> = [];
      let backendReachable = false;

      try {
        [apiDevices, apiPlants] = await Promise.all([
          deviceService.getDevices(),
          plantService.getPlants(),
        ]);
        backendReachable = true;
      } catch {
        // Backend vraiment injoignable → mode simulation
        console.log('[SECOMO] Backend injoignable, mode simulation activé');
        setBackendOnline(false);
        setDevices(INITIAL_DEVICES);
        setPlantProfiles(INITIAL_PLANTS);
        setSelectedDeviceId(INITIAL_DEVICES[0].id);
        simulationActive.current = true;
        return;
      }

      if (!backendReachable) return;

      // 2. Backend joignable : traiter les données réelles (même si vides)
      const devs = apiDevices.map(apiDeviceToDevice);
      const plants = apiPlants.map(apiPlantToProfile);

      // Fusionner avec les métadonnées locales (seul currentPlantProfileId reste en localStorage)
      const localMeta = loadLocalMeta(currentUser.id);
      const devsWithMeta = devs.map(d => ({
        ...d,
        // Only restore currentPlantProfileId from localStorage (stationId/bacPosition now from API)
        currentPlantProfileId: localMeta.deviceMeta[d.id]?.currentPlantProfileId || d.currentPlantProfileId,
      }));

      // Load stations from backend — auto-create default if none exist
      let apiStations = await stationService.getStations().catch(() => []);
      if (apiStations.length === 0) {
        try {
          const created = await stationService.createStation({ name: 'Station Principale', location_label: '' });
          apiStations = [created];
        } catch { /* keep empty */ }
      }
      const finalStations = apiStations.length > 0
        ? apiStations.map(s => ({
            id: s.id, name: s.name, locationLabel: s.location_label, createdAt: s.created_at,
            gridRows: localMeta.stationGrids?.[s.id]?.rows ?? 2,
            gridCols: localMeta.stationGrids?.[s.id]?.cols ?? 2,
          }))
        : (localMeta.stations.length > 0 ? localMeta.stations : INITIAL_STATIONS);

      setDevices(devsWithMeta);
      setStations(finalStations);
      setPlantProfiles(plants);
      const firstDev = devsWithMeta[0];
      setSelectedDeviceId(firstDev?.id ?? null);
      setSelectedStationId(firstDev?.stationId || finalStations[0]?.id || null);
      setBackendOnline(true);

      // 3. Charger la plant_config de chaque device (plante assignée)
      for (const dev of devsWithMeta) {
        try {
          const config = await deviceService.getPlantConfig(dev.id);
          if (config?.plant_id) {
            setDevices(prev => prev.map(d =>
              d.id === dev.id ? { ...d, currentPlantProfileId: config.plant_id! } : d
            ));
          }
        } catch { /* pas de config encore */ }
      }

      // 4. Charger l'historique des readings pour chaque device
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

      // 5. Charger l'historique d'arrosage
      setWateringEvents([]);
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

      // 6. Connecter le WebSocket
      const token = getAccessToken();
      if (token) {
        wsService.connect(token);
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
        waterTankLevel: data.water_tank_level ?? 80,
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
        recs.push({ id: 'r1', text: recMsg('r1', currentReading.humidity, lang), severity: 'critical', action: 'water' });
      }
      if (currentReading.humidity > currentPlant.humidityMax) {
        recs.push({ id: 'r2', text: recMsg('r2', currentReading.humidity, lang), severity: 'warning' });
      }
      if (currentReading.tempAir > currentPlant.tempMax) {
        recs.push({ id: 'r3', text: recMsg('r3', currentReading.tempAir, lang), severity: 'warning', action: 'fan' });
      }
      if (currentReading.tempAir < currentPlant.tempMin) {
        recs.push({ id: 'r4', text: recMsg('r4', currentReading.tempAir, lang), severity: 'warning' });
      }
      if (currentReading.light < currentPlant.lightMin) {
        recs.push({ id: 'r5', text: recMsg('r5', currentReading.light, lang), severity: 'info', action: 'light' });
      }
    } else {
      // Mode Auto : seulement la luminosité (si insuffisante malgré l'éclairage auto → déplacer le bac)
      if (currentReading.light < currentPlant.lightMin) {
        recs.push({ id: 'r6', text: recMsg('r6', currentReading.light, lang), severity: 'info', action: 'move' });
      }
    }

    // pH (both modes — not actionable via UI, advisory)
    const ph = currentReading.soilPh;
    if (ph < currentPlant.phMin - 1) {
      recs.push({ id: 'r9', text: recMsg('r9', ph, lang), severity: 'critical' });
    } else if (ph < currentPlant.phMin) {
      recs.push({ id: 'r7', text: recMsg('r7', ph, lang), severity: 'warning' });
    } else if (ph > currentPlant.phMax + 1) {
      recs.push({ id: 'r10', text: recMsg('r10', ph, lang), severity: 'critical' });
    } else if (ph > currentPlant.phMax) {
      recs.push({ id: 'r8', text: recMsg('r8', ph, lang), severity: 'warning' });
    }

    // Battery (both modes)
    const bat = currentReading.batteryLevel;
    if (bat < 5) {
      recs.push({ id: 'r13', text: recMsg('r13', bat, lang), severity: 'critical' });
    } else if (bat < 10) {
      recs.push({ id: 'r12', text: recMsg('r12', bat, lang), severity: 'warning' });
    } else if (bat < 20) {
      recs.push({ id: 'r11', text: recMsg('r11', bat, lang), severity: 'info' });
    }

    // Water tank (both modes)
    const tank = currentReading.waterTankLevel;
    if (tank < 10) {
      recs.push({ id: 'r15', text: recMsg('r15', tank, lang), severity: 'critical' });
    } else if (tank < 30) {
      recs.push({ id: 'r14', text: recMsg('r14', tank, lang), severity: 'warning' });
    }

    return recs;
  }, [currentReading, currentPlant, selectedDevice, lang]);

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
        message: alertMsg('humidity_low', { val: reading.humidity, threshold: plant.humidityMin, plantName: plant.name }, lang),
      });
    } else if (reading.humidity > plant.humidityMax) {
      problems.push({
        plantName: plant.name,
        category: 'humidity',
        type: 'warning',
        message: alertMsg('humidity_high', { val: reading.humidity, threshold: plant.humidityMax, plantName: plant.name }, lang),
      });
    }

    // Température
    if (reading.tempAir < plant.tempMin) {
      const deficit = plant.tempMin - reading.tempAir;
      problems.push({
        plantName: plant.name,
        category: 'temperature',
        type: deficit > 5 ? 'critical' : 'warning',
        message: alertMsg('temp_low', { val: reading.tempAir, threshold: plant.tempMin, plantName: plant.name }, lang),
      });
    } else if (reading.tempAir > plant.tempMax) {
      const excess = reading.tempAir - plant.tempMax;
      problems.push({
        plantName: plant.name,
        category: 'temperature',
        type: excess > 5 ? 'critical' : 'warning',
        message: alertMsg('temp_high', { val: reading.tempAir, threshold: plant.tempMax, plantName: plant.name }, lang),
      });
    }

    // pH
    if (reading.soilPh < plant.phMin) {
      problems.push({
        plantName: plant.name,
        category: 'ph',
        type: 'warning',
        message: alertMsg('ph_low', { val: reading.soilPh, threshold: plant.phMin, plantName: plant.name }, lang),
      });
    } else if (reading.soilPh > plant.phMax) {
      problems.push({
        plantName: plant.name,
        category: 'ph',
        type: 'warning',
        message: alertMsg('ph_high', { val: reading.soilPh, threshold: plant.phMax, plantName: plant.name }, lang),
      });
    }

    // Lumière
    if (reading.light < plant.lightMin) {
      problems.push({
        plantName: plant.name,
        category: 'light',
        type: 'info',
        message: alertMsg('light_low', { val: reading.light, threshold: plant.lightMin, plantName: plant.name }, lang),
      });
    }

    // Batterie (indépendant de la plante)
    if (reading.batteryLevel < 20) {
      problems.push({
        plantName: plant.name,
        category: 'battery',
        type: reading.batteryLevel < 10 ? 'critical' : 'warning',
        message: alertMsg('battery_low', { val: reading.batteryLevel, threshold: 20, plantName: plant.name }, lang),
      });
    }

    // Réservoir d'eau (indépendant de la plante)
    if (reading.waterTankLevel < 30) {
      problems.push({
        plantName: plant.name,
        category: 'water_tank',
        type: reading.waterTankLevel < 10 ? 'critical' : 'warning',
        message: alertMsg('water_tank_low', { val: reading.waterTankLevel, threshold: 30, plantName: plant.name }, lang),
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
  }, [plantProfiles, lang]);

  // --- Simulation Engine (actif uniquement si backend offline) ---
  const generateReading = useCallback((
    deviceId: string,
    prev?: SensorReading,
    deviceState?: { fanSpeed: number; isLightOn: boolean },
    atTime?: number,
  ): SensorReading => {
    const defaultBase = SIM_BASES[deviceId] || { tempAir: 26, humidity: 52, light: 50, soilPh: 6.2, waterTankLevel: 80 };
    const base = prev || { ...defaultBase, batteryLevel: 85, waterTankLevel: defaultBase.waterTankLevel ?? 80 } as any;
    // Fan cools down temp proportionally to speed; light boosts measured light
    const fanCooling = deviceState?.fanSpeed ? (deviceState.fanSpeed / 100) * 0.6 : 0;
    const lightBoost = deviceState?.isLightOn ? 4 : 0;
    return {
      deviceId,
      timestamp: new Date(atTime ?? Date.now()).toISOString(),
      tempAir: Math.min(Math.max(base.tempAir + (Math.random() - 0.45) * 0.6 - fanCooling, 5), 45),
      humidity: Math.min(Math.max(base.humidity + (Math.random() - 0.55) * 1.2, 0), 100),
      light: Math.min(Math.max(base.light + (Math.random() - 0.5) * 3 + lightBoost, 0), 100),
      soilPh: Math.min(Math.max(base.soilPh + (Math.random() - 0.5) * 0.05, 0), 14),
      batteryLevel: Math.min(Math.max((base.batteryLevel ?? 85) - Math.random() * 0.05, 0), 100),
      waterTankLevel: Math.min(Math.max((base.waterTankLevel ?? 80) - Math.random() * 0.03, 0), 100),
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
      const now = Date.now();
      devices.forEach(dev => {
        let last: SensorReading | undefined;
        const readings: SensorReading[] = [];
        for (let i = 0; i < 30; i++) {
          // Étaler sur la dernière heure : 1 point toutes les 2 minutes
          last = generateReading(dev.id, last, undefined, now - (30 - 1 - i) * 2 * 60 * 1000);
          readings.push(last);
        }
        initialHistory[dev.id] = readings;

        // Générer des événements d'arrosage simulés uniquement en mode hors-ligne
        if (!backendOnline) {
          [48, 36, 24, 12, 4].forEach((hoursAgo, i) => {
            initialEvents.push({
              id: `sim-${dev.id}-${i}`,
              deviceId: dev.id,
              timestamp: new Date(now - hoursAgo * 3600 * 1000).toISOString(),
              mode: i % 2 === 0 ? WateringMode.AUTO : WateringMode.MANUAL,
              durationSec: [20, 30, 25, 15, 30][i],
              reason: i % 2 === 0 ? t('sim_reason_auto', lang) : t('sim_reason_manual', lang),
            });
          });
        }
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
          const newReading = generateReading(dev.id, lastReading, { fanSpeed: dev.fanSpeed ?? 0, isLightOn: dev.isLightOn });
          deviceHistory.push(newReading);
          if (deviceHistory.length > 60) deviceHistory.shift();
          next[dev.id] = deviceHistory;
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [backendOnline, devices, history, generateReading]);

  // --- Moteur d'alertes + automatisation : réagit à chaque mise à jour de l'historique ---
  useEffect(() => {
    if (!devices.length || !Object.keys(history).length) return;
    devices.forEach(dev => {
      const deviceHistory = history[dev.id];
      if (!deviceHistory?.length) return;
      const latestReading = deviceHistory[deviceHistory.length - 1];
      checkAlerts(latestReading, dev);
      runAutoModeRef.current(latestReading, dev);
    });
  }, [history, devices, checkAlerts]);

  // --- Auto-init données quand un bac sélectionné n'a aucun historique ---
  useEffect(() => {
    if (!selectedDeviceId) return;
    if ((history[selectedDeviceId]?.length ?? 0) > 0) return; // déjà des données

    // Générer des lectures initiales simulées pour ce bac (backend offline ou pas encore de données ESP32)
    setHistory(prev => {
      if ((prev[selectedDeviceId]?.length ?? 0) > 0) return prev; // double-check
      const readings: SensorReading[] = [];
      let last: SensorReading | undefined;
      const t0 = Date.now();
      for (let i = 0; i < 10; i++) {
        last = generateReading(selectedDeviceId, last, undefined, t0 - (10 - 1 - i) * 2 * 60 * 1000);
        readings.push(last);
      }
      return { ...prev, [selectedDeviceId]: readings };
    });
  }, [selectedDeviceId, history, generateReading]);

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
    // Réinitialiser les refs pour permettre un rechargement complet à la prochaine connexion
    prevUserIdRef.current = null;
    simulationActive.current = false;
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

  // Sauvegarder les métadonnées locales dès que devices changent
  // stationId/bacPosition sont maintenant en DB — on ne persiste que currentPlantProfileId
  useEffect(() => {
    if (!currentUser || !devices.length) return;
    const stationGrids: Record<string, { rows: number; cols: number }> = {};
    stations.forEach(s => { stationGrids[s.id] = { rows: s.gridRows ?? 2, cols: s.gridCols ?? 2 }; });
    const meta: LocalMeta = {
      stations: [],  // no longer needed in localStorage
      stationGrids,
      deviceMeta: Object.fromEntries(
        devices.map(d => [d.id, {
          currentPlantProfileId: d.currentPlantProfileId,
        }])
      ),
    };
    saveLocalMeta(currentUser.id, meta);
  }, [devices, stations, currentUser]);

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

    setStatusMsg({ text: t('prof_saved_ok', lang), type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      setStatusMsg({ text: t('prof_pwd_mismatch', lang), type: 'error' });
      return;
    }

    if (backendOnline) {
      try {
        await authService.changePassword(passwordForm.current, passwordForm.next);
        setStatusMsg({ text: t('prof_pwd_ok', lang), type: 'success' });
      } catch (err: any) {
        setStatusMsg({ text: err.message || t('prof_pwd_error', lang), type: 'error' });
        return;
      }
    } else {
      setStatusMsg({ text: t('prof_pwd_ok_sim', lang), type: 'success' });
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

  // --- Automation Engine ---
  const runAutoMode = useCallback((reading: SensorReading, device: Device) => {
    if (!device.automationEnabled) return;
    const plant = plantProfiles.find(p => p.id === device.currentPlantProfileId);
    if (!plant) return;
    const cfg = device.config;

    // --- Auto Watering (humidity below min and not already watering) ---
    if (reading.humidity < plant.humidityMin && !device.isWatering) {
      const now = Date.now();
      const lastWatering = lastAutoWateringRef.current[device.id] ?? 0;
      if (now - lastWatering < 30000) return; // 30s cooldown to avoid spam
      lastAutoWateringRef.current[device.id] = now;

      const targetHumidity = Math.min(plant.humidityMax, plant.humidityMin + 15);
      const deficit = targetHumidity - reading.humidity; // %
      const waterNeededL = (deficit / 100) * cfg.soilVolumeLiters * 0.1;

      const tankAvailableL = (reading.waterTankLevel / 100) * cfg.tankCapacityLiters;
      const actualWaterL = Math.min(waterNeededL, tankAvailableL);

      if (actualWaterL < 0.05) {
        // Tank essentially empty — skip watering (alert already generated by checkAlerts)
        return;
      }

      const durationSec = Math.min(120, Math.max(5, Math.round((actualWaterL / cfg.flowRateLitersPerMin) * 60)));
      const tankDecrease = (actualWaterL / cfg.tankCapacityLiters) * 100;

      // Deduct from tank in latest reading
      setHistory(prev => {
        const dh = [...(prev[device.id] || [])];
        if (dh.length > 0) {
          const last = { ...dh[dh.length - 1] };
          last.waterTankLevel = Math.max(0, last.waterTankLevel - tankDecrease);
          dh[dh.length - 1] = last;
        }
        return { ...prev, [device.id]: dh };
      });

      const reason = lang === 'EN'
        ? `Auto: humidity ${reading.humidity.toFixed(0)}% → watering ${actualWaterL.toFixed(2)}L (${durationSec}s)`
        : `Auto: humidité ${reading.humidity.toFixed(0)}% → arrosage ${actualWaterL.toFixed(2)}L (${durationSec}s)`;
      triggerWatering(device.id, WateringMode.AUTO, reason, durationSec);
    }

    // --- Auto Fan (variable speed based on temp excess) ---
    if (cfg.autoVentilation) {
      if (reading.tempAir > plant.tempMax) {
        const tempExcess = reading.tempAir - plant.tempMax;
        // fanSpeed% = min(100, (excess / 10) × 100)
        const fanSpeed = Math.min(100, Math.round((tempExcess / 10) * 100));
        setDevices(prev => prev.map(d =>
          d.id === device.id ? { ...d, isFanOn: true, fanSpeed } : d
        ));
      } else if (reading.tempAir <= plant.tempMax * 0.97) {
        // Temperature back in range — turn fan off
        setDevices(prev => prev.map(d =>
          d.id === device.id ? { ...d, isFanOn: false, fanSpeed: 0 } : d
        ));
      }
    }

    // --- Auto Light ---
    if (cfg.autoLighting) {
      if (reading.light < plant.lightMin && !device.isLightOn) {
        setDevices(prev => prev.map(d => d.id === device.id ? { ...d, isLightOn: true } : d));
      } else if (reading.light >= plant.lightMin * 1.2 && device.isLightOn) {
        setDevices(prev => prev.map(d => d.id === device.id ? { ...d, isLightOn: false } : d));
      }
    }
  }, [plantProfiles, triggerWatering, lang]);
  runAutoModeRef.current = runAutoMode;

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

  // Persiste le lien plante↔bac en backend
  const persistPlantLink = async (deviceId: string, plantId: string | undefined) => {
    if (!backendOnline) return;
    try {
      const plant = plantId ? plantProfiles.find(p => p.id === plantId) : undefined;
      await deviceService.setPlantConfig(deviceId, {
        plant_id: plantId || undefined,
        name: plant?.name || '',
        humidity_min: plant?.humidityMin ?? 0,
        humidity_max: plant?.humidityMax ?? 100,
        temp_min: plant?.tempMin ?? 0,
        temp_max: plant?.tempMax ?? 40,
        light_min: plant?.lightMin ?? 0,
        ph_min: plant?.phMin ?? 0,
        ph_max: plant?.phMax ?? 14,
        notes: plant?.notes || '',
      });
    } catch { /* silently fail */ }
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
  const handleSaveStation = async (station: Station) => {
    const exists = stations.find(s => s.id === station.id);
    if (backendOnline) {
      try {
        if (exists) {
          await stationService.updateStation(station.id, { name: station.name, location_label: station.locationLabel || '' });
        } else {
          const created = await stationService.createStation({ name: station.name, location_label: station.locationLabel || '' });
          station = { ...station, id: created.id, createdAt: created.created_at };
        }
      } catch { /* fallback local */ }
    }
    if (exists) {
      setStations(prev => prev.map(s => s.id === station.id ? station : s));
    } else {
      setStations(prev => [...prev, station]);
      setExpandedStationId(station.id);
    }
    setEditingStation(null);
  };

  const handleDeleteStation = async (stationId: string) => {
    // Collecter les IDs des bacs de cette station avant suppression
    const stationDeviceIds = devices.filter(d => d.stationId === stationId).map(d => d.id);

    // Supprimer bacs + alertes liées immédiatement
    setDevices(prev => prev.filter(d => d.stationId !== stationId));
    setAlerts(prev => prev.filter(a => !stationDeviceIds.includes(a.deviceId)));

    // Si le bac sélectionné était dans cette station, en sélectionner un autre
    if (stationDeviceIds.includes(selectedDeviceId ?? '')) {
      const remaining = devices.filter(d => d.stationId !== stationId);
      setSelectedDeviceId(remaining[0]?.id ?? null);
    }

    setStations(prev => prev.filter(s => s.id !== stationId));
    if (expandedStationId === stationId) setExpandedStationId(null);

    if (backendOnline) {
      // Supprimer les bacs en DB d'abord, puis la station
      await Promise.all(stationDeviceIds.map(id => deviceService.deleteDevice(id).catch(() => {})));
      try { await stationService.deleteStation(stationId); } catch { /* silently fail */ }
    }
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
        persistPlantLink(bac1.id, bac2.currentPlantProfileId);
        persistPlantLink(bac2.id, bac1.currentPlantProfileId);
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

    let newBacId: string;
    if (backendOnline) {
      try {
        const created = await deviceService.createDevice({ name, size: 'Moyen', level: 'Base', location_label: '', station_id: stationId, bac_row: row, bac_col: col });
        const newBac: Device = {
          id: created.id, name: created.name, size: 'Moyen', level: 'Base',
          locationLabel: '', stationId, bacPosition: { row, col },
          isLightOn: false, isFanOn: false, fanSpeed: 0, createdAt: created.created_at,
          isWatering: false, automationEnabled: false,
          config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 30, phCalibrationOffset: 0, tankCapacityLiters: 20, flowRateLitersPerMin: 0.5, soilVolumeLiters: 15, volumeM3: 0.5 },
        };
        setDevices(prev => [...prev, newBac]);
        newBacId = created.id;
      } catch {
        // fallback local
        newBacId = Math.random().toString(36).substr(2, 9);
        const newBac: Device = {
          id: newBacId, name, size: 'Moyen', level: 'Base', locationLabel: '',
          stationId, bacPosition: { row, col },
          isLightOn: false, isFanOn: false, fanSpeed: 0, createdAt: new Date().toISOString(),
          isWatering: false, automationEnabled: false,
          config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 30, phCalibrationOffset: 0, tankCapacityLiters: 20, flowRateLitersPerMin: 0.5, soilVolumeLiters: 15, volumeM3: 0.5 },
        };
        setDevices(prev => [...prev, newBac]);
      }
    } else {
      newBacId = Math.random().toString(36).substr(2, 9);
      const newBac: Device = {
        id: newBacId, name, size: 'Moyen', level: 'Base', locationLabel: '',
        stationId, bacPosition: { row, col },
        isLightOn: false, isFanOn: false, fanSpeed: 0, createdAt: new Date().toISOString(),
        isWatering: false, automationEnabled: false,
        config: { autoVentilation: false, autoLighting: false, samplingFrequencySec: 30, phCalibrationOffset: 0, tankCapacityLiters: 20, flowRateLitersPerMin: 0.5, soilVolumeLiters: 15, volumeM3: 0.5 },
      };
      setDevices(prev => [...prev, newBac]);
    }

    // Générer immédiatement les données initiales simulées pour ce nouveau bac
    setHistory(prev => {
      const readings: SensorReading[] = [];
      let last: SensorReading | undefined;
      const t0 = Date.now();
      for (let i = 0; i < 10; i++) {
        last = generateReading(newBacId, last, undefined, t0 - (10 - 1 - i) * 2 * 60 * 1000);
        readings.push(last);
      }
      return { ...prev, [newBacId]: readings };
    });
  };

  const handleDeleteBac = async (bacId: string) => {
    setDevices(prev => prev.filter(d => d.id !== bacId));
    setAlerts(prev => prev.filter(a => a.deviceId !== bacId));
    if (selectedDeviceId === bacId) setSelectedDeviceId(devices.find(d => d.id !== bacId)?.id ?? null);
    if (backendOnline) {
      try { await deviceService.deleteDevice(bacId); } catch { /* silently fail */ }
    }
  };

  // --- Refresh capteurs ---
  // Génère une nouvelle lecture simulée pour un bac donné
  const refreshDeviceSim = useCallback((deviceId: string) => {
    setHistory(prev => {
      const deviceHistory = [...(prev[deviceId] || [])];
      const lastReading = deviceHistory[deviceHistory.length - 1];
      const newReading = generateReading(deviceId, lastReading);
      deviceHistory.push(newReading);
      if (deviceHistory.length > 60) deviceHistory.shift();
      return { ...prev, [deviceId]: deviceHistory };
    });
  }, [generateReading]);

  // Refresh un seul bac (backend ou simulation)
  const refreshDevice = useCallback(async (deviceId: string) => {
    if (backendOnline) {
      try {
        const readings = await sensorService.getReadings(deviceId, 60);
        if (readings.length > 0) {
          setHistory(prev => ({ ...prev, [deviceId]: readings.map(r => apiReadingToReading(r, deviceId)) }));
          return;
        }
      } catch { /* fallback simulation */ }
    }
    refreshDeviceSim(deviceId);
  }, [backendOnline, refreshDeviceSim]);

  // Refresh tous les bacs
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      for (const dev of devices) {
        await refreshDevice(dev.id);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Styles ---
  const themeClasses = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-700';
  const cardClasses = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const sidebarClasses = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const headerClasses = isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100';
  const inputClasses = isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-none text-slate-800';

  if (page === 'landing' && !currentUser) return <Landing onNavigate={(p) => setPage(p)} />;
  if ((page === 'login' || page === 'register') && !currentUser) return <Auth type={page} onBack={() => setPage('landing')} onSwitch={() => setPage(page === 'login' ? 'register' : 'login')} onSuccess={handleAuthSuccess} />;
  if (!currentUser) return <Landing onNavigate={(p) => setPage(p)} />;

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${themeClasses}`}>
      {/* Botanical Sidebar */}
      <aside className={`w-24 lg:w-72 border-r flex flex-col fixed inset-y-0 z-50 transition-colors ${sidebarClasses}`}>
        <div onClick={() => setView('dashboard')} className="p-8 flex items-center gap-4 cursor-pointer group">
          <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
            <i className="fas fa-leaf text-2xl"></i>
          </div>
          <span className={`text-2xl font-black hidden lg:block tracking-tighter transition-colors ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>SECOMO</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: 'fa-chart-pie', label: t('nav_dashboard', lang) },
            { id: 'plantes', icon: 'fa-seedling', label: t('nav_plants', lang) },
            { id: 'alerts', icon: 'fa-bell', label: t('nav_alerts', lang), badge: alerts.filter(a => !a.read).length },
            { id: 'activities', icon: 'fa-history', label: t('nav_activities', lang) },
            { id: 'config', icon: 'fa-sliders', label: t('nav_config', lang) },
            { id: 'profil', icon: 'fa-user-gear', label: t('nav_profile', lang) },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${view === item.id ? 'bg-green-600/10 text-green-500 font-bold' : 'text-slate-400 hover:bg-green-600/5'}`}
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
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="hidden lg:block truncate">
              <p className={`text-xs font-black truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full p-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors font-bold flex items-center gap-4">
            <i className="fas fa-power-off w-6 text-center"></i>
            <span className="hidden lg:block">{t('logout', lang)}</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 ml-24 lg:ml-72 overflow-y-auto">
        <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-8 py-4 flex items-center justify-between gap-6 transition-colors ${headerClasses}`}>
          {/* Gauche : titre + station */}
          <div className="flex-shrink-0">
            <h2 className={`text-3xl font-black capitalize tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{view === 'profil' ? t('prof_title', lang) : view}</h2>
            <p className="text-slate-400 text-sm font-medium">
              {t('header_station', lang)}: <span className="text-green-500">{stations.find(s => s.id === selectedStationId)?.name || '—'}</span>
            </p>
          </div>

          {/* Centre : toggle AUTO/MANUEL + note (dashboard uniquement) */}
          {view === 'dashboard' && selectedDevice && (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                onClick={async () => {
                  const newVal = !selectedDevice.automationEnabled;
                  setDevices(prev => prev.map(d => d.id === selectedDevice.id ? {
                    ...d,
                    automationEnabled: newVal,
                    ...(newVal ? { isFanOn: false, isLightOn: false } : {}),
                  } : d));
                  if (backendOnline) {
                    try { await deviceService.updateDevice(selectedDevice.id, { automation_enabled: newVal }); } catch { /* silently fail */ }
                  }
                }}
                className={`relative cursor-pointer rounded-2xl p-0.5 transition-all duration-300 shadow-md select-none w-44 ${
                  selectedDevice.automationEnabled
                    ? 'bg-green-500 shadow-green-500/30'
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
                    <span className="text-xs uppercase tracking-wide">{t('dash_manual_mode', lang)}</span>
                  </div>
                  <div className={`py-2 px-3 flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                    selectedDevice.automationEnabled ? 'text-green-700 font-black' : 'text-white/50 font-bold'
                  }`}>
                    <i className="fas fa-robot text-xs"></i>
                    <span className="text-xs uppercase tracking-wide">{t('dash_auto_mode', lang)}</span>
                  </div>
                </div>
              </div>
              <p className={`text-[10px] text-center leading-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <i className="fas fa-circle-info mr-1"></i>
                {t('dash_auto_info', lang)} <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('nav_config', lang)} <i className="fas fa-gear text-[9px]"></i></span>
              </p>
            </div>
          )}

          {/* Droite : sélecteur station + statut profil */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {view !== 'profil' && stations.length > 0 && (
              <select
                value={selectedStationId || ''}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className={`${inputClasses} border-none rounded-2xl px-6 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none cursor-pointer`}
              >
                {stations.map(station => (
                  <option key={station.id} value={station.id}>
                    {station.name}{station.locationLabel ? ` — ${station.locationLabel}` : ''}
                  </option>
                ))}
              </select>
            )}
            {view === 'profil' && statusMsg && (
              <span className={`px-4 py-2 rounded-xl text-xs font-bold animate-fade-in ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'}`}>
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
                        <i className="fas fa-box mr-2"></i>{t('header_bac', lang)} :
                      </span>
                      {stationBacs.map(bac => (
                        <button
                          key={bac.id}
                          onClick={() => setSelectedDeviceId(bac.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedDeviceId === bac.id
                              ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                              : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                          }`}
                        >
                          {bac.name}{bac.physicalId ? ' ⚡' : ''}
                        </button>
                      ))}
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title={t('gen_refresh', lang)}
                        className={`ml-auto px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-green-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-green-600'}`}
                      >
                        <i className={`fas fa-rotate-right ${isRefreshing ? 'animate-spin' : ''}`}></i>
                      </button>
                    </div>
                  );
                })()}
                {/* Cartes capteurs — placeholder si pas encore de données */}
                {currentReading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SensorCard label={t('dash_temp', lang)} value={formatTemp(currentReading.tempAir)} unit={currentUser.unit === 'celsius' ? '°C' : '°F'} status={currentPlant ? getSensorStatus(currentReading.tempAir, currentPlant.tempMin, currentPlant.tempMax) : 'neutral'} targetRange={currentPlant ? `${formatTemp(currentPlant.tempMin).toFixed(0)}-${formatTemp(currentPlant.tempMax).toFixed(0)}°` : '—'} icon="fa-thermometer-half" isDark={isDarkMode} lang={lang} showTempToggle tempUnit={currentUser.unit} onToggleTempUnit={u => updateProfile({ unit: u })} />
                    <SensorCard label={t('dash_humidity', lang)} value={currentReading.humidity} unit="%" status={currentPlant ? getSensorStatus(currentReading.humidity, currentPlant.humidityMin, currentPlant.humidityMax) : 'neutral'} targetRange={currentPlant ? `${currentPlant.humidityMin}-${currentPlant.humidityMax}%` : '—'} icon="fa-tint" isDark={isDarkMode} lang={lang} />
                    <SensorCard label={t('dash_light', lang)} value={currentReading.light} unit="%" status={currentPlant ? (currentReading.light < currentPlant.lightMin ? 'low' : 'ok') : 'neutral'} targetRange={currentPlant ? `Min ${currentPlant.lightMin}%` : '—'} icon="fa-sun" isDark={isDarkMode} lang={lang} />
                    <SensorCard label={t('dash_ph', lang)} value={currentReading.soilPh} unit="pH" status={currentPlant ? getSensorStatus(currentReading.soilPh, currentPlant.phMin, currentPlant.phMax) : 'neutral'} targetRange={currentPlant ? `${currentPlant.phMin}-${currentPlant.phMax}` : '—'} icon="fa-flask" isDark={isDarkMode} lang={lang} />
                    <SensorCard label={t('dash_battery', lang)} value={Math.round(currentReading.batteryLevel)} unit="%" status={currentReading.batteryLevel < 20 ? 'low' : 'ok'} targetRange="Min 20%" icon="fa-battery-half" isDark={isDarkMode} lang={lang} />
                    <WaterTankCard level={currentReading.waterTankLevel} capacityLiters={selectedDevice.config.tankCapacityLiters} isDark={isDarkMode} lang={lang} />
                  </div>
                ) : (
                  <div className={`${cardClasses} p-12 rounded-[32px] border text-center space-y-4`}>
                    <i className="fas fa-satellite-dish text-4xl text-slate-300 block"></i>
                    <p className={`font-black text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dash_no_sensor', lang)}</p>
                    <p className="text-sm text-slate-400">{t('dash_no_sensor_sub', lang)}</p>
                  </div>
                )}
                <HistoryChart data={history[selectedDevice.id] || []} isDark={isDarkMode} lang={lang} />

                {/* Contrôles Manuels — ligne horizontale sous l'historique, visible seulement en mode MANUEL */}
                {!selectedDevice.automationEnabled && (
                  <div className={`${cardClasses} rounded-[32px] border shadow-sm overflow-hidden`}>
                    <div className="px-8 py-5 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}">
                      <i className="fas fa-hand-pointer text-slate-400"></i>
                      <h3 className={`text-base font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('dash_manual_controls', lang)}</h3>
                    </div>
                    <div className="px-8 py-6">
                      <div className="grid grid-cols-3 gap-6">

                        {/* 1. Arroser */}
                        <div className="space-y-3">
                          <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            <i className="fas fa-faucet-drip"></i> {t('ctrl_watering_label', lang)}
                          </p>
                          {selectedDevice.isWatering ? (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                              <i className="fas fa-droplet text-blue-400 animate-bounce text-sm"></i>
                              <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                {t('water_in_progress', lang)} ({wateringCountdown[selectedDevice.id] ?? 0} sec)
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
                              <span className="text-xs text-slate-400">{t('water_seconds', lang)}</span>
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
                            {selectedDevice.isWatering ? t('water_stop', lang) : `${t('water_start', lang)} ${manualDuration}s`}
                          </button>
                          {selectedDevice.lastWatering && (
                            <p className="text-[10px] text-slate-400">
                              <i className="fas fa-clock mr-1"></i>{t('water_last', lang)} : {new Date(selectedDevice.lastWatering).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* 2. Ventilation */}
                        <div className="space-y-3">
                          <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            <i className="fas fa-wind"></i> {t('ctrl_ventilation_label', lang)}
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={10} max={40} step={1}
                              value={manualTargetTemp}
                              onChange={e => setManualTargetTemp(Math.min(40, Math.max(10, +e.target.value)))}
                              className={`w-20 text-center rounded-xl py-2 font-black text-sm outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
                            />
                            <span className="text-xs text-slate-400">{t('ctrl_target_temp', lang)}</span>
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
                            {selectedDevice.isFanOn ? `${t('ctrl_fan_on', lang)} — ${manualTargetTemp}°C` : t('ctrl_fan_off', lang)}
                          </button>
                        </div>

                        {/* 3. Lumière */}
                        <div className="space-y-3">
                          <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            <i className="fas fa-lightbulb"></i> {t('ctrl_led', lang)}
                          </p>
                          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <i className={`fas fa-lightbulb text-xl ${selectedDevice.isLightOn ? 'text-yellow-400' : (isDarkMode ? 'text-slate-600' : 'text-slate-300')}`}></i>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedDevice.isLightOn ? t('ctrl_light_on', lang) : t('ctrl_light_off', lang)}</span>
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
                            {selectedDevice.isLightOn ? t('ctrl_light_turn_off', lang) : t('ctrl_light_turn_on', lang)}
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
                  <h3 className={`text-lg font-black mb-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('dash_cultivated_plant', lang)}</h3>
                  {currentPlant ? (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 shadow-inner">
                        <i className="fas fa-seedling text-3xl"></i>
                      </div>
                      <div>
                        <p className={`font-black text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{translatePlantName(currentPlant.name, lang)}</p>
                        <p className="text-xs text-slate-400 italic">"{currentPlant.notes}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-slate-200/50 rounded-2xl flex items-center justify-center text-slate-400">
                        <i className="fas fa-circle-question text-2xl"></i>
                      </div>
                      <p className="text-sm text-slate-400">{t('plant_no_assigned', lang)}</p>
                    </div>
                  )}
                  <button onClick={() => setView('plantes')} className="w-full p-4 border-2 border-green-500/20 hover:border-green-500 hover:text-green-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                    {currentPlant ? t('plant_edit', lang) : t('rec_assign_plant', lang)}
                  </button>
                </div>

                {/* Recommandations */}
                {recommendations.length > 0 && (
                  <div className={`${cardClasses} p-6 rounded-[32px] border shadow-sm space-y-3`}>
                    <h3 className={`text-base font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('rec_title', lang)}</h3>
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

                {/* Mode AUTO actif : statut ventilateur + bouton switch manuel */}
                {selectedDevice.automationEnabled && (
                  <div className="space-y-2">
                    {selectedDevice.isFanOn && (selectedDevice.fanSpeed ?? 0) > 0 && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                        <i className="fas fa-wind animate-spin" style={{ animationDuration: '1.2s' }}></i>
                        <span>{t('dash_auto_fan_speed', lang)} : {selectedDevice.fanSpeed}%</span>
                      </div>
                    )}
                    {selectedDevice.isLightOn && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                        <i className="fas fa-lightbulb"></i>
                        <span>{t('ctrl_light_on', lang)}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, automationEnabled: false } : d))}
                      className={`w-full px-5 py-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-colors ${isDarkMode ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}
                    >
                      <i className="fas fa-lock text-green-500 text-xs"></i>
                      <span className="text-xs font-bold text-green-600">{t('dash_auto_active', lang)}</span>
                    </button>
                  </div>
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
                     <div className="w-16 h-16 bg-green-600 rounded-[20px] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-green-600/20">
                       {currentUser.firstName[0]}
                     </div>
                     <div>
                       <h3 className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('prof_personal_info', lang)}</h3>
                       <p className="text-slate-400 text-sm font-medium">{t('prof_personal_info_sub', lang)}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_firstname', lang)}</label>
                      <input 
                        type="text" 
                        value={profileForm.firstName} 
                        onChange={e => setProfileForm({...profileForm, firstName: e.target.value})}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_lastname', lang)}</label>
                      <input 
                        type="text" 
                        value={profileForm.lastName} 
                        onChange={e => setProfileForm({...profileForm, lastName: e.target.value})}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`} 
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_email_readonly', lang)}</label>
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
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95"
                    >
                      {t('prof_save_info', lang)}
                    </button>
                  </div>
                </section>

                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('prof_security_title', lang)}</h3>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_current_pwd', lang)}</label>
                      <input 
                        type="password" 
                        value={passwordForm.current}
                        onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                        placeholder="••••••••"
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_new_pwd', lang)}</label>
                        <input 
                          type="password" 
                          value={passwordForm.next}
                          onChange={e => setPasswordForm({...passwordForm, next: e.target.value})}
                          placeholder="••••••••"
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_confirm_pwd', lang)}</label>
                        <input 
                          type="password" 
                          value={passwordForm.confirm}
                          onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                          placeholder="••••••••"
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit"
                        className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                      >
                        {t('prof_change_pwd', lang)}
                      </button>
                    </div>
                  </form>
                </section>
              </div>

              {/* Right Column: Preferences */}
              <div className="space-y-8">
                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('prof_appearance', lang)}</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => updateProfile({ theme: 'light' })}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentUser.theme === 'light' ? 'border-green-500 bg-green-500/10' : 'border-transparent bg-slate-100/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <i className={`fas fa-sun ${currentUser.theme === 'light' ? 'text-green-500' : 'text-slate-400'}`}></i>
                        <span className={`font-bold ${currentUser.theme === 'light' ? 'text-green-600' : 'text-slate-500'}`}>{t('prof_theme_light_label', lang)}</span>
                      </div>
                      {currentUser.theme === 'light' && <i className="fas fa-check-circle text-green-500"></i>}
                    </button>
                    <button 
                      onClick={() => updateProfile({ theme: 'dark' })}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentUser.theme === 'dark' ? 'border-green-500 bg-green-500/10' : 'border-transparent bg-slate-800/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <i className={`fas fa-moon ${currentUser.theme === 'dark' ? 'text-green-500' : 'text-slate-400'}`}></i>
                        <span className={`font-bold ${currentUser.theme === 'dark' ? 'text-green-100' : 'text-slate-500'}`}>{t('prof_theme_dark_label', lang)}</span>
                      </div>
                      {currentUser.theme === 'dark' && <i className="fas fa-check-circle text-green-500"></i>}
                    </button>
                  </div>
                </section>

                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('prof_general_settings', lang)}</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_language', lang)}</label>
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
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('prof_timezone', lang)}</label>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('prof_sys_info', lang)}</p>
                  <p className="text-xs font-bold text-slate-500">{t('prof_account_created', lang)} {new Date(currentUser.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{t('prof_user_id', lang)}: {currentUser.id}</p>
                </div>
              </div>
            </div>
          )}

          {view === 'plantes' && (() => {
            // Palette de couleurs par station (indexée par position dans le tableau stations)
            const STATION_PALETTE = [
              { hex: '#10b981', light: '#d1fae5', border: '#10b981', text: '#059669', label: 'emerald' },
              { hex: '#3b82f6', light: '#dbeafe', border: '#3b82f6', text: '#2563eb', label: 'blue' },
              { hex: '#22c55e', light: '#dcfce7', border: '#22c55e', text: '#16a34a', label: 'green' },
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
                    {plantProfiles.length} {plantProfiles.length !== 1 ? t('plant_profiles_total', lang) : t('plant_profile_total', lang)}
                    {unlinkedCount > 0 && (
                      <span className="ml-2 text-rose-400 font-bold">· {unlinkedCount} {unlinkedCount > 1 ? t('plant_unlinked_plural', lang) : t('plant_unlinked_single', lang)}</span>
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
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-green-100"
                >
                  <i className="fas fa-plus"></i> {t('plant_new', lang)}
                </button>
              </div>

              {plantProfiles.length === 0 && (
                <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                  <i className="fas fa-seedling text-5xl text-slate-300 mb-6 block"></i>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('plant_no_plants', lang)}</p>
                  <p className="text-sm text-slate-400 mt-2">{t('plant_no_plants_sub', lang)}</p>
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
                        className="relative overflow-hidden rounded-[30px] flex flex-col h-full"
                        style={{ backgroundColor: isUnlinked ? (isDarkMode ? '#1e0a0a' : '#fff5f5') : innerBg }}
                      >
                        {/* Strip de couleur station(s) en haut — arrêts durs bien visibles */}
                        {!isUnlinked && colors.length > 0 && (
                          <div className="h-2.5 w-full flex-none" style={{ background: stripBackground }}></div>
                        )}

                      <div className="p-8 flex flex-col flex-1">
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
                            <button onClick={() => setEditingPlant(plant)} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-green-500' : 'bg-slate-100 text-slate-400 hover:text-green-600'}`}><i className="fas fa-edit"></i></button>
                            <button onClick={() => setDeletingPlantId(plant.id)} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-rose-500' : 'bg-slate-100 text-slate-400 hover:text-rose-500'}`}><i className="fas fa-trash"></i></button>
                          </div>
                        </div>

                        <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{translatePlantName(plant.name, lang)}</h3>
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2 h-10">{plant.notes || <span className="italic">{t('plant_no_notes', lang)}</span>}</p>

                        {/* Badges des stations liées */}
                        {isUnlinked ? (
                          <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-4">
                            <i className="fas fa-unlink"></i> {t('plant_unlinked', lang)}
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
                          onClick={() => setView('config')}
                          className={`mt-auto w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            isUnlinked
                              ? (isDarkMode ? 'bg-rose-500/20 hover:bg-green-600 text-rose-300 hover:text-white' : 'bg-rose-100 hover:bg-green-600 text-rose-500 hover:text-white')
                              : (isDarkMode ? 'bg-slate-800 hover:bg-green-600 text-slate-100' : 'bg-slate-100 hover:bg-green-600 hover:text-white text-slate-600')
                          }`}
                        >
                          <i className="fas fa-link text-xs"></i>
                          {t('plant_link_to_bac', lang)}
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
            const plantsWithoutBac = plantProfiles.filter(p => !devices.some(d => d.currentPlantProfileId === p.id));

            return (
            <div className="space-y-8">
              {/* En-tête */}
              <div className="flex justify-between items-center">
                <p className="text-slate-400 font-medium">{t('cfg_subtitle', lang)}</p>
                <button
                  onClick={() => setEditingStation({ id: Math.random().toString(36).substr(2, 9), name: '', locationLabel: '', createdAt: new Date().toISOString(), gridRows: 2, gridCols: 2 })}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-green-100"
                >
                  <i className="fas fa-plus"></i> {t('cfg_new_station', lang)}
                </button>
              </div>

              {/* Alerte plantes sans bac */}
              {plantsWithoutBac.length > 0 && (
                <div className={`p-5 rounded-2xl border-2 border-rose-400/40 ${isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50'} flex items-start gap-3`}>
                  <i className="fas fa-circle-exclamation text-rose-500 mt-0.5"></i>
                  <div>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>{t('cfg_plants_no_bac', lang)}</p>
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
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('cfg_no_stations', lang)}</p>
                  <p className="text-sm text-slate-400 mt-2">{t('cfg_no_stations_sub', lang)}</p>
                </div>
              )}

              {stations.map(station => {
                const GRID_ROWS = station.gridRows ?? 2;
                const GRID_COLS = station.gridCols ?? 2;
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
                        <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                          <i className="fas fa-layer-group"></i>
                        </div>
                        <div>
                          <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{station.name || t('cfg_station_no_name', lang)}</h3>
                          <p className="text-sm text-slate-400"><i className="fas fa-location-dot mr-1"></i>{station.locationLabel || t('cfg_unknown_location', lang)} · {stationBacs.length} {stationBacs.length !== 1 ? t('cfg_bacs', lang) : t('cfg_bac', lang)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={e => { e.stopPropagation(); setEditingStation(station); }} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-green-400' : 'hover:bg-slate-100 text-slate-400 hover:text-green-600'}`}>
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
                          {/* Warning bacs hors grille */}
                          {stationBacs.some(d => d.bacPosition && (d.bacPosition.row >= GRID_ROWS || d.bacPosition.col >= GRID_COLS)) && (
                            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium ${isDarkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                              <i className="fas fa-triangle-exclamation flex-shrink-0"></i>
                              <span>{t('cfg_grid_bacs_warning', lang)}</span>
                            </div>
                          )}
                          {/* Note d'aide */}
                          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium ${isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                            <i className="fas fa-circle-info flex-shrink-0"></i>
                            <span>
                              {t('cfg_grid_help', lang)}
                            </span>
                          </div>
                          {swapSourceBacId && (
                            <p className="text-xs font-bold text-amber-500 flex items-center gap-2">
                              <i className="fas fa-arrows-rotate"></i>
                              {lang === 'FR' ? 'Bac sélectionné' : 'Tank selected'} : <span className="text-amber-400">{devices.find(d => d.id === swapSourceBacId)?.name}</span> — {t('cfg_bac_swap_hint', lang)}
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
                                          : (isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-green-500/50' : 'border-slate-200 bg-slate-50 hover:border-green-400')
                                      }`}
                                    >
                                      <p className={`text-[10px] font-black uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{bac.name}</p>
                                      {plant ? (
                                        <p className="text-[10px] text-green-500 font-bold mt-1 truncate flex items-center gap-1"><i className="fas fa-seedling"></i>{translatePlantName(plant.name, lang)}</p>
                                      ) : (
                                        <p className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1"><i className="fas fa-exclamation-circle"></i>{t('cfg_no_plant', lang)}</p>
                                      )}
                                      {/* Assign plant dropdown */}
                                      <select
                                        value={bac.currentPlantProfileId || ''}
                                        onChange={e => { e.stopPropagation(); const val = e.target.value || undefined; setDevices(prev => prev.map(d => d.id === bac.id ? { ...d, currentPlantProfileId: val } : d)); persistPlantLink(bac.id, val); }}
                                        onClick={e => e.stopPropagation()}
                                        className={`mt-2 w-full text-[9px] rounded-lg p-1 font-bold outline-none cursor-pointer border-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'}`}
                                      >
                                        <option value="">{t('plant_select_none', lang)}</option>
                                        {plantProfiles.map(p => <option key={p.id} value={p.id}>{translatePlantName(p.name, lang)}</option>)}
                                      </select>
                                      <div className="absolute top-2 right-2 flex gap-1">
                                        <button onClick={e => { e.stopPropagation(); setConfiguringBacId(bac.id); }} className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] opacity-40 group-hover:opacity-100 hover:bg-blue-500/40 transition-all" title={t('cfg_bac_settings', lang)}><i className="fas fa-gear"></i></button>
                                        <button onClick={e => { e.stopPropagation(); handleDeleteBac(bac.id); }} className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 hover:bg-rose-500/40 transition-all"><i className="fas fa-times"></i></button>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={`${row}-${col}`}
                                    onClick={() => { setEditingBac({ stationId: station.id, row, col }); setNewBacName(''); }}
                                    className={`min-h-[90px] p-3 rounded-2xl border-2 border-dashed cursor-pointer flex items-center justify-center transition-all ${isDarkMode ? 'border-slate-700 hover:border-green-500/50 hover:bg-green-500/5' : 'border-slate-200 hover:border-green-400 hover:bg-green-50'}`}
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
                  {t('act_title', lang)}
                  {uniqueEvents.length > 0 && ` · ${uniqueEvents.length} ${uniqueEvents.length > 1 ? t('act_events_plural', lang) : t('act_events', lang)}`}
                </p>
              </div>

              {uniqueEvents.length === 0 ? (
                <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                  <i className="fas fa-history text-5xl text-slate-300 mb-6 block"></i>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('act_no_activity', lang)}</p>
                  <p className="text-sm text-slate-400 mt-2">{t('act_no_activity_sub', lang)}</p>
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
                              ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
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
                              <span className={`text-xs font-black uppercase tracking-wider ${isAuto ? 'text-green-500' : 'text-blue-500'}`}>
                                {isAuto ? 'AUTO' : 'MANUEL'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                <i className="fas fa-microchip mr-1"></i>{deviceInfo?.name || t('cfg_bac_unknown', lang)}
                              </span>
                              {stationInfo && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
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
                persistPlantLink(alert.deviceId, plant.id);
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
                      ? `${alerts.length} ${alerts.length > 1 ? t('alert_count_plural', lang) : t('alert_count', lang)} · ${unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'toutes lues'} · ${totalStationsWithAlerts} station${totalStationsWithAlerts > 1 ? 's' : ''}`
                      : t('alert_no_alerts', lang)}
                  </p>
                  {alerts.length > 0 && (
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-blue-400 hover:bg-blue-500/20' : 'bg-slate-100 text-blue-600 hover:bg-blue-50'}`}
                        >
                          <i className="fas fa-check-double mr-1.5"></i>{t('alert_mark_all', lang)}
                        </button>
                      )}
                      <button
                        onClick={() => setAlerts([])}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-100 text-rose-500 hover:bg-rose-50'}`}
                      >
                        <i className="fas fa-trash mr-1.5"></i>{t('alert_clear_all', lang)}
                      </button>
                    </div>
                  )}
                </div>

                {alerts.length === 0 ? (
                  <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                    <i className="fas fa-check-circle text-5xl text-emerald-400 mb-6 block"></i>
                    <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('alert_no_alerts', lang)}</p>
                    <p className="text-sm text-slate-400 mt-2">{t('alert_no_alerts_sub', lang)}</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(alertsByStation).map(([stationId, { station, deviceGroups }]) => {
                      const stationAlertCount = Object.values(deviceGroups).reduce((sum, g) => sum + g.length, 0);
                      return (
                        <div key={stationId}>
                          {/* En-tête station */}
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                              <i className="fas fa-layer-group text-sm"></i>
                            </div>
                            <div>
                              <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {station?.name || t('alert_unknown_station', lang)}
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
                          <div className="space-y-6 pl-4 border-l-2 border-green-600/20 ml-4">
                            {Object.entries(deviceGroups).map(([deviceId, deviceAlerts]) => {
                              const deviceInfo = devices.find(d => d.id === deviceId);
                              return (
                                <div key={deviceId}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                      <i className={`fas fa-microchip text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}></i>
                                    </div>
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                      {deviceInfo?.name || t('cfg_bac_unknown', lang)}
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
                                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 px-1.5 py-0.5 rounded-md bg-rose-500/10">{t('alert_new', lang)}</span>
                                            )}
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                              <i className="fas fa-seedling mr-1"></i>{translatePlantName(alert.plantName, lang)}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/70 text-slate-500'}`}>
                                              <i className={`fas ${categoryIcon(alert.category)} mr-1`}></i>{alert.category}
                                            </span>
                                          </div>
                                          <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{alert.message}</p>
                                          <div className="flex items-center justify-between mt-2">
                                            <p className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleString()}</p>
                                            <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                              <i className="fas fa-arrow-right"></i>{t('alert_see_dashboard', lang)}
                                            </span>
                                          </div>
                                        </div>
                                        {/* Bouton supprimer */}
                                        <button
                                          onClick={(e) => handleDeleteAlert(e, alert.id)}
                                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-rose-500/20 flex-shrink-0 ${isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'}`}
                                          title={t('alert_delete', lang)}
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
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{t('plant_delete_confirm', lang)}</h3>
                <p className="text-sm text-slate-400">"{plant?.name && translatePlantName(plant.name, lang)}" {t('plant_delete_desc', lang)}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setDeletingPlantId(null)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t('plant_cancel', lang)}</button>
                <button onClick={() => handleDeletePlant(deletingPlantId)} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-rose-500/20">{t('plant_delete_btn', lang)}</button>
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
              {stations.find(s => s.id === editingStation.id) ? t('cfg_edit_station', lang) : t('cfg_new_station_title', lang)}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_station_name', lang)}</label>
                <input type="text" value={editingStation.name} onChange={e => setEditingStation({ ...editingStation, name: e.target.value })} placeholder={t('cfg_station_name_ph', lang)} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_station_location', lang)}</label>
                <input type="text" value={editingStation.locationLabel} onChange={e => setEditingStation({ ...editingStation, locationLabel: e.target.value })} placeholder={t('cfg_station_location_ph', lang)} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
              </div>

              {/* Taille de la grille */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_grid_size', lang)}</label>
                <div className="grid grid-cols-2 gap-4">
                  {(['gridRows', 'gridCols'] as const).map(key => {
                    const label = key === 'gridRows' ? t('cfg_grid_rows', lang) : t('cfg_grid_cols', lang);
                    const val = (editingStation[key] ?? 2) as number;
                    // Calcul du min : au moins couvrir les bacs existants de cette station
                    const existingBacs = stations.find(s => s.id === editingStation.id)
                      ? devices.filter(d => d.stationId === editingStation.id)
                      : [];
                    const minVal = key === 'gridRows'
                      ? Math.max(1, ...existingBacs.map(d => (d.bacPosition?.row ?? 0) + 1))
                      : Math.max(1, ...existingBacs.map(d => (d.bacPosition?.col ?? 0) + 1));
                    return (
                      <div key={key} className="space-y-2">
                        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                        <div className={`flex items-center gap-2 p-2 rounded-2xl ${inputClasses}`}>
                          <button
                            type="button"
                            onClick={() => setEditingStation({ ...editingStation, [key]: Math.max(minVal, val - 1) })}
                            disabled={val <= minVal}
                            className="w-8 h-8 rounded-xl bg-green-500/10 text-green-500 font-black text-lg flex items-center justify-center disabled:opacity-30 hover:bg-green-500/20 transition-colors"
                          >−</button>
                          <span className="flex-1 text-center font-black text-lg">{val}</span>
                          <button
                            type="button"
                            onClick={() => setEditingStation({ ...editingStation, [key]: Math.min(8, val + 1) })}
                            disabled={val >= 8}
                            className="w-8 h-8 rounded-xl bg-green-500/10 text-green-500 font-black text-lg flex items-center justify-center disabled:opacity-30 hover:bg-green-500/20 transition-colors"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Aperçu grille */}
                <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${editingStation.gridCols ?? 2}, minmax(0, 1fr))` }}>
                  {Array.from({ length: (editingStation.gridRows ?? 2) * (editingStation.gridCols ?? 2) }).map((_, i) => (
                    <div key={i} className={`h-5 rounded-md ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button onClick={() => setEditingStation(null)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t('cfg_cancel', lang)}</button>
              <button onClick={() => { if (editingStation.name.trim()) handleSaveStation(editingStation); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-green-600/20">{t('cfg_save', lang)}</button>
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
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_label_name', lang)}</label>
                  <input type="text" value={bac.name} onChange={e => update({ name: e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_label_size', lang)}</label>
                    <select value={bac.size} onChange={e => update({ size: e.target.value as any })} className={`w-full ${inputClasses} rounded-2xl p-3 font-bold outline-none cursor-pointer`}>
                      <option value="Petit">{t('cfg_size_small', lang)}</option><option value="Moyen">{t('cfg_size_medium', lang)}</option><option value="Grand">{t('cfg_size_large', lang)}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_label_measures', lang)}</label>
                    <select value={bac.config.samplingFrequencySec} onChange={e => updateCfg({ samplingFrequencySec: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-3 font-bold outline-none cursor-pointer`}>
                      <option value={5}>5 sec</option><option value={10}>10 sec</option><option value={30}>30 sec</option><option value={60}>1 min</option>
                    </select>
                  </div>
                </div>
                {bac.physicalId && (
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${isDarkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                    <i className="fas fa-link text-green-500 text-xs"></i>
                    <p className={`text-[10px] font-mono truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{bac.physicalId}</p>
                  </div>
                )}
                {bac.apiKey && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      <i className="fas fa-key mr-1"></i>Clé API (ESP32)
                    </label>
                    <div className={`flex items-center gap-2 p-3 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <p className={`flex-1 text-[10px] font-mono truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{bac.apiKey}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(bac.apiKey!);
                        }}
                        className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold"
                        title="Copier la clé"
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Automatisation */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_label_automation', lang)}</p>
                {[
                  { key: 'automationEnabled', label: t('cfg_auto_watering', lang), desc: t('cfg_auto_watering_desc', lang), icon: 'fa-faucet-drip', color: 'bg-blue-500', isDevice: true },
                  { key: 'autoVentilation', label: t('cfg_auto_ventilation', lang), desc: t('cfg_auto_ventilation_desc', lang), icon: 'fa-wind', color: 'bg-amber-500', isDevice: false },
                  { key: 'autoLighting', label: t('cfg_auto_lighting', lang), desc: t('cfg_auto_lighting_desc', lang), icon: 'fa-lightbulb', color: 'bg-yellow-500', isDevice: false },
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
              <button onClick={() => setConfiguringBacId(null)} className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest">{t('gen_close', lang)}</button>
            </div>
          </div>
        );
      })()}

      {/* Modal nouveau bac dans la grille */}
      {editingBac && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setEditingBac(null); setNewBacName(''); setNewBacPhysicalId(''); }}>
          <div className={`w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto ${cardClasses} rounded-[32px] border shadow-2xl p-10 space-y-6`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <i className="fas fa-box mr-2 text-green-500"></i>{t('cfg_new_bac_title', lang)}
            </h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('cfg_bac_name', lang)}</label>
              <input
                type="text" value={newBacName} onChange={e => setNewBacName(e.target.value)}
                placeholder={t('cfg_bac_name_ph', lang)} autoFocus
                className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`}
              />
            </div>

            {/* Lien physique QR / manuel */}
            {newBacPhysicalId ? (
              <div className={`p-4 rounded-2xl flex items-center gap-3 ${isDarkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                <i className="fas fa-link text-green-500"></i>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-500">{t('cfg_physical_linked', lang)}</p>
                  <p className={`text-[10px] font-mono truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{newBacPhysicalId}</p>
                </div>
                <button onClick={() => setNewBacPhysicalId('')} className="text-slate-400 hover:text-rose-400 text-xs"><i className="fas fa-times"></i></button>
              </div>
            ) : (
              <QRScanner isDark={isDarkMode} lang={lang} onCode={code => setNewBacPhysicalId(code)} />
            )}

            <div className="flex gap-4 pt-2">
              <button onClick={() => { setEditingBac(null); setNewBacName(''); setNewBacPhysicalId(''); }} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t('cfg_cancel', lang)}</button>
              <button
                onClick={() => {
                  if (!newBacName.trim()) return;
                  handleCreateBac(editingBac.stationId, editingBac.row, editingBac.col);
                  setEditingBac(null); setNewBacPhysicalId('');
                }}
                disabled={!newBacName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-green-600/20"
              >
                {t('cfg_create_bac', lang)}
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
              {plantProfiles.find(p => p.id === editingPlant.id) ? t('plant_edit_profile', lang) : t('plant_new_profile', lang)}
            </h3>

            {/* Recherche dans le catalogue (5500+ plantes) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                <i className="fas fa-search mr-1"></i> {t('plant_catalog_search', lang)}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Ex: Rosa, Lavandula, Mentha, Solanum..."
                  className={`w-full ${inputClasses} rounded-2xl p-4 pl-11 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`}
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
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${isDarkMode ? 'hover:bg-green-600/20' : 'hover:bg-green-50'} ${i > 0 ? (isDarkMode ? 'border-t border-slate-700' : 'border-t border-slate-100') : ''}`}
                    >
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {commonName ? <>{commonName} <span className="font-normal italic text-slate-400 text-xs">({cp.name})</span></> : cp.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{cp.category}{cp.origin ? ` — ${cp.origin}` : ''}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-slate-400">{cp.temp_min}–{cp.temp_max}°C</p>
                        <p className="text-[10px] text-green-500 font-bold">Hum {cp.humidity_min}–{cp.humidity_max}%</p>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
              {catalogSearch.length >= 2 && catalogResults.length === 0 && !catalogLoading && (
                <p className={`text-xs ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('plant_catalog_no_result', lang)}
                </p>
              )}
              {catalogSearch.length < 2 && (
                <p className={`text-xs italic ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('plant_catalog_hint', lang)}
                </p>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('plant_name', lang)}</label>
                <input
                  type="text"
                  value={editingPlant.name}
                  onChange={e => setEditingPlant({ ...editingPlant, name: e.target.value })}
                  placeholder="Ex: Basilic Grand Vert"
                  className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all`}
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
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('plant_form_humidity', lang)}</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'humidity' ? 'text-green-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'humidity' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {t('plant_form_humidity_tip', lang)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('gen_minimum', lang)}</span>
                    <input type="number" min="0" max="100" value={editingPlant.humidityMin} onChange={e => setEditingPlant({ ...editingPlant, humidityMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('gen_maximum', lang)}</span>
                    <input type="number" min="0" max="100" value={editingPlant.humidityMax} onChange={e => setEditingPlant({ ...editingPlant, humidityMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
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
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('plant_form_temp', lang)}</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'temp' ? 'text-green-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'temp' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {t('plant_form_temp_tip', lang)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('gen_minimum', lang)}</span>
                    <input type="number" value={editingPlant.tempMin} onChange={e => setEditingPlant({ ...editingPlant, tempMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('gen_maximum', lang)}</span>
                    <input type="number" value={editingPlant.tempMax} onChange={e => setEditingPlant({ ...editingPlant, tempMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
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
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('plant_form_light', lang)}</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'light' ? 'text-green-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'light' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {t('plant_form_light_tip', lang)}
                    </div>
                  )}
                </div>
                <input type="number" min="0" max="100" value={editingPlant.lightMin} onChange={e => setEditingPlant({ ...editingPlant, lightMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
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
                    <i className="fas fa-flask text-green-400 text-xs"></i>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('plant_form_ph', lang)}</span>
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'ph' ? 'text-green-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'ph' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {t('plant_form_ph_tip', lang)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('gen_minimum', lang)}</span>
                    <input type="number" step="0.1" min="0" max="14" value={editingPlant.phMin} onChange={e => setEditingPlant({ ...editingPlant, phMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('gen_maximum', lang)}</span>
                    <input type="number" step="0.1" min="0" max="14" value={editingPlant.phMax} onChange={e => setEditingPlant({ ...editingPlant, phMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500`} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('plant_notes', lang)}</label>
                <textarea
                  value={editingPlant.notes}
                  onChange={e => setEditingPlant({ ...editingPlant, notes: e.target.value })}
                  rows={3}
                  placeholder={t('plant_notes_placeholder', lang)}
                  className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-green-500 resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setEditingPlant(null)}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t('plant_cancel', lang)}
              </button>
              <button
                onClick={() => { if (editingPlant.name.trim()) handlePlantSave(editingPlant); }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95"
              >
                {t('plant_save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
