
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  User, Device, PlantProfile, SensorReading, Alert, Role,
  WateringMode, WateringEvent, SensorStatus, Recommendation, AlertType, AlertCategory, ThemeType, UnitType, LanguageType
} from './types';
import { INITIAL_PLANTS, INITIAL_DEVICES, MOCK_USER } from './constants';
import SensorCard from './components/SensorCard';
import HistoryChart from './components/HistoryChart';
import WeatherWidget from './components/WeatherWidget';
import Landing from './components/Landing';
import Auth from './components/Auth';

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
    config: { hasTempWater: true, hasPowerMeter: true, samplingFrequencySec: 10, phCalibrationOffset: 0 },
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
    tempAir: r.temp_air ?? 0, tempWater: r.temp_water ?? 0,
    humidity: r.humidity_soil ?? 0, light: r.light ?? 0,
    soilPh: r.soil_ph ?? 0, watts: r.watts ?? 0,
  };
}

const App: React.FC = () => {
  // --- Routing & Auth State ---
  const [page, setPage] = useState<'landing' | 'login' | 'register' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // --- Main App State ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [plantProfiles, setPlantProfiles] = useState<PlantProfile[]>([]);
  const [history, setHistory] = useState<Record<string, SensorReading[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [wateringEvents, setWateringEvents] = useState<WateringEvent[]>([]);
  const [view, setView] = useState<'dashboard' | 'plantes' | 'alerts' | 'config' | 'activities' | 'profil'>('dashboard');
  const simulationActive = useRef(false);

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

    const loadData = async () => {
      try {
        // Charger devices et plantes depuis l'API
        const [apiDevices, apiPlants] = await Promise.all([
          deviceService.getDevices(),
          plantService.getPlants(),
        ]);
        const devs = apiDevices.map(apiDeviceToDevice);
        const plants = apiPlants.map(apiPlantToProfile);

        setDevices(devs.length > 0 ? devs : INITIAL_DEVICES);
        setPlantProfiles(plants.length > 0 ? plants : INITIAL_PLANTS);
        setSelectedDeviceId(devs.length > 0 ? devs[0].id : INITIAL_DEVICES[0].id);
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
        tempWater: data.temp_water ?? 0,
        humidity: data.humidity_soil ?? 0,
        light: data.light ?? 0,
        soilPh: data.soil_ph ?? 0,
        watts: data.watts ?? 0,
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
    if (!currentReading || !currentPlant) return [];
    const recs: Recommendation[] = [];

    if (currentReading.humidity < currentPlant.humidityMin) {
      recs.push({ id: 'r1', text: 'Humidité critique : Arrosage nécessaire immédiatement.', severity: 'critical', action: 'Watering' });
    }
    if (currentReading.tempAir > currentPlant.tempMax) {
      recs.push({ id: 'r2', text: 'Température trop élevée : Activer ventilation ou ombrage.', severity: 'warning' });
    }
    if (currentReading.light < currentPlant.lightMin) {
      recs.push({ id: 'r3', text: 'Lumière insuffisante : Déplacer le bac ou activer les LEDs.', severity: 'info' });
    }
    return recs;
  }, [currentReading, currentPlant]);

  // --- Alert Engine (check TOUTES les plantes pour chaque reading) ---
  const checkAlerts = useCallback((reading: SensorReading, device: Device) => {
    const now = new Date().toISOString();

    // Collecter les problèmes pour CHAQUE plante
    const problems: { plantName: string; category: AlertCategory; type: AlertType; message: string }[] = [];

    plantProfiles.forEach(plant => {
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
    });

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
          // Mettre à jour l'alerte existante (message + timestamp + sévérité)
          updated[existingIdx] = {
            ...updated[existingIdx],
            message: problem.message,
            type: problem.type,
            timestamp: now,
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
          });
        }
      });

      return updated.slice(0, 200);
    });
  }, [plantProfiles]);

  // --- Simulation Engine (actif uniquement si backend offline) ---
  const generateReading = useCallback((deviceId: string, prev?: SensorReading): SensorReading => {
    const base = prev || {
      tempAir: 22, tempWater: 18, humidity: 55, light: 65, soilPh: 6.8, watts: 12
    } as any;
    return {
      deviceId,
      timestamp: new Date().toISOString(),
      tempAir: Math.min(Math.max(base.tempAir + (Math.random() - 0.5) * 0.4, 5), 45),
      tempWater: Math.min(Math.max(base.tempWater + (Math.random() - 0.5) * 0.2, 5), 35),
      humidity: Math.min(Math.max(base.humidity + (Math.random() - 0.5) * 1.5, 0), 100),
      light: Math.min(Math.max(base.light + (Math.random() - 0.5) * 4, 0), 100),
      soilPh: Math.min(Math.max(base.soilPh + (Math.random() - 0.5) * 0.05, 0), 14),
      watts: 8 + Math.random() * 6
    };
  }, []);

  useEffect(() => {
    // Ne lancer la simulation que si le backend est offline et qu'on a des devices
    if (backendOnline || devices.length === 0) return;

    // Générer l'historique initial si vide
    if (Object.keys(history).length === 0) {
      const initialHistory: Record<string, SensorReading[]> = {};
      devices.forEach(dev => {
        let last: SensorReading | undefined;
        const readings: SensorReading[] = [];
        for (let i = 0; i < 30; i++) {
          last = generateReading(dev.id, last);
          readings.push(last);
        }
        initialHistory[dev.id] = readings;
      });
      setHistory(initialHistory);
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

          // Vérifier les alertes pour CHAQUE device
          checkAlerts(newReading, dev);
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [backendOnline, devices, generateReading, checkAlerts]);

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

  const triggerWatering = async (deviceId: string, mode: WateringMode, reason: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: true } : d));

    const durationSec = 15;

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
      } catch { /* fallback local */ }
    } else {
      const event: WateringEvent = {
        id: Math.random().toString(36).substr(2, 9),
        deviceId, timestamp: new Date().toISOString(),
        mode, durationSec, reason,
      };
      setWateringEvents(prev => [event, ...prev]);
    }

    setTimeout(() => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: false, lastWatering: new Date().toISOString() } : d));
    }, durationSec * 1000);
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

  const handlePlantSave = (plant: PlantProfile) => {
    if (plantProfiles.find(p => p.id === plant.id)) {
      setPlantProfiles(prev => prev.map(p => p.id === plant.id ? plant : p));
    } else {
      setPlantProfiles(prev => [...prev, plant]);
    }
    setEditingPlant(null);
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
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
            <i className="fas fa-leaf text-2xl"></i>
          </div>
          <span className={`text-2xl font-black hidden lg:block tracking-tighter transition-colors ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>SECOMO</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
            { id: 'plantes', icon: 'fa-seedling', label: 'Mes Plantes' },
            { id: 'alerts', icon: 'fa-bell', label: 'Alertes', badge: alerts.length },
            { id: 'activities', icon: 'fa-history', label: 'Activités' },
            { id: 'config', icon: 'fa-sliders', label: 'Configuration' },
            { id: 'profil', icon: 'fa-user-gear', label: 'Mon Profil' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${view === item.id ? 'bg-emerald-600/10 text-emerald-500 font-bold' : 'text-slate-400 hover:bg-emerald-600/5'}`}
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
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
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
        <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-8 py-6 flex justify-between items-center transition-colors ${headerClasses}`}>
          <div>
            <h2 className={`text-3xl font-black capitalize tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{view === 'profil' ? 'Mon Profil' : view}</h2>
            <p className="text-slate-400 text-sm font-medium">Station: <span className="text-emerald-500">{selectedDevice?.name}</span></p>
          </div>
          
          <div className="flex items-center gap-4">
            {view !== 'profil' && (
              <select 
                value={selectedDeviceId || ''} 
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className={`${inputClasses} border-none rounded-2xl px-6 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer`}
              >
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            {view === 'profil' && statusMsg && (
              <span className={`px-4 py-2 rounded-xl text-xs font-bold animate-fade-in ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {statusMsg.text}
              </span>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {view === 'dashboard' && selectedDevice && currentReading && currentPlant && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SensorCard label="Temp Air" value={formatTemp(currentReading.tempAir)} unit={currentUser.unit === 'celsius' ? '°C' : '°F'} status={getSensorStatus(currentReading.tempAir, currentPlant.tempMin, currentPlant.tempMax)} targetRange={`${formatTemp(currentPlant.tempMin).toFixed(0)}-${formatTemp(currentPlant.tempMax).toFixed(0)}°`} icon="fa-thermometer-half" isDark={isDarkMode} />
                  <SensorCard label="Humidité" value={currentReading.humidity} unit="%" status={getSensorStatus(currentReading.humidity, currentPlant.humidityMin, currentPlant.humidityMax)} targetRange={`${currentPlant.humidityMin}-${currentPlant.humidityMax}%`} icon="fa-tint" isDark={isDarkMode} />
                  <SensorCard label="Lumière" value={currentReading.light} unit="%" status={currentReading.light < currentPlant.lightMin ? 'low' : 'ok'} targetRange={`Min ${currentPlant.lightMin}%`} icon="fa-sun" isDark={isDarkMode} />
                  <SensorCard label="pH Sol" value={currentReading.soilPh} unit="pH" status={getSensorStatus(currentReading.soilPh, currentPlant.phMin, currentPlant.phMax)} targetRange={`${currentPlant.phMin}-${currentPlant.phMax}`} icon="fa-flask" isDark={isDarkMode} />
                  <SensorCard label="Puissance" value={currentReading.watts} unit="W" status="ok" icon="fa-bolt" hidden={!selectedDevice.config.hasPowerMeter} isDark={isDarkMode} />
                  <SensorCard label="Temp Eau" value={formatTemp(currentReading.tempWater)} unit={currentUser.unit === 'celsius' ? '°C' : '°F'} status="ok" icon="fa-faucet-drip" hidden={!selectedDevice.config.hasTempWater} isDark={isDarkMode} />
                </div>
                <HistoryChart data={history[selectedDevice.id] || []} isDark={isDarkMode} />
              </div>
              <div className="space-y-8">
                <WeatherWidget isDark={isDarkMode} />
                <div className={`${cardClasses} p-8 rounded-[32px] border shadow-sm`}>
                  <h3 className={`text-lg font-black mb-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Plante Cultivée</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                      <i className="fas fa-seedling text-3xl"></i>
                    </div>
                    <div>
                      <p className={`font-black text-xl ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentPlant.name}</p>
                      <p className="text-xs text-slate-400 italic">"{currentPlant.notes}"</p>
                    </div>
                  </div>
                  <button onClick={() => setView('plantes')} className="w-full p-4 border-2 border-emerald-500/20 hover:border-emerald-500 hover:text-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                    Changer de Profil
                  </button>
                </div>

                {/* Panneau Arrosage + Contrôle */}
                <div className={`${cardClasses} p-8 rounded-[32px] border shadow-sm space-y-6`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Arrosage</h3>
                    {selectedDevice.isWatering && (
                      <span className="flex items-center gap-2 text-xs font-bold text-blue-500 animate-pulse">
                        <i className="fas fa-shower"></i> En cours...
                      </span>
                    )}
                  </div>

                  {/* Dernier arrosage */}
                  {selectedDevice.lastWatering && (
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <i className="fas fa-clock mr-1"></i>
                      Dernier : {new Date(selectedDevice.lastWatering).toLocaleString()}
                    </div>
                  )}

                  {/* Mode AUTO toggle */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <i className={`fas fa-robot ${selectedDevice.automationEnabled ? 'text-emerald-500' : 'text-slate-400'}`}></i>
                      <div>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Mode AUTO</p>
                        <p className="text-[10px] text-slate-400">Arrosage automatique</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, automationEnabled: !d.automationEnabled } : d))}
                      className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${selectedDevice.automationEnabled ? 'bg-emerald-500' : (isDarkMode ? 'bg-slate-700' : 'bg-slate-300')}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${selectedDevice.automationEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                  </div>

                  {/* Bouton arrosage manuel */}
                  <button
                    onClick={() => {
                      if (!selectedDevice.isWatering) {
                        triggerWatering(selectedDevice.id, WateringMode.MANUAL, 'Arrosage manuel depuis le dashboard');
                      }
                    }}
                    disabled={selectedDevice.isWatering}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${
                      selectedDevice.isWatering
                        ? (isDarkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                    }`}
                  >
                    <i className={`fas ${selectedDevice.isWatering ? 'fa-spinner fa-spin' : 'fa-faucet-drip'}`}></i>
                    {selectedDevice.isWatering ? 'Arrosage en cours...' : 'Arroser maintenant'}
                  </button>

                  {/* Commandes rapides */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerWatering(selectedDevice.id, WateringMode.MANUAL, 'Arrosage court (10s)')}
                      disabled={selectedDevice.isWatering}
                      className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 disabled:opacity-40' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40'}`}
                    >
                      <i className="fas fa-tint mr-1"></i>10s
                    </button>
                    <button
                      onClick={() => {
                        setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, isWatering: true } : d));
                        const event: WateringEvent = {
                          id: Math.random().toString(36).substr(2, 9),
                          deviceId: selectedDevice.id, timestamp: new Date().toISOString(),
                          mode: WateringMode.MANUAL, durationSec: 30, reason: 'Arrosage long (30s)'
                        };
                        setWateringEvents(prev => [event, ...prev]);
                        setTimeout(() => {
                          setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, isWatering: false, lastWatering: new Date().toISOString() } : d));
                        }, 30000);
                      }}
                      disabled={selectedDevice.isWatering}
                      className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 disabled:opacity-40' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40'}`}
                    >
                      <i className="fas fa-tint mr-1"></i>30s
                    </button>
                  </div>
                </div>

                {/* Recommandations */}
                {recommendations.length > 0 && (
                  <div className={`${cardClasses} p-8 rounded-[32px] border shadow-sm space-y-4`}>
                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Recommandations</h3>
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
                        } mt-0.5`}></i>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{rec.text}</p>
                      </div>
                    ))}
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
                     <div className="w-16 h-16 bg-emerald-600 rounded-[20px] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-emerald-600/20">
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
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom</label>
                      <input 
                        type="text" 
                        value={profileForm.lastName} 
                        onChange={e => setProfileForm({...profileForm, lastName: e.target.value})}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`} 
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
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
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`} 
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
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Confirmation</label>
                        <input 
                          type="password" 
                          value={passwordForm.confirm}
                          onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                          placeholder="••••••••"
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`} 
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
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentUser.theme === 'light' ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent bg-slate-100/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <i className={`fas fa-sun ${currentUser.theme === 'light' ? 'text-emerald-500' : 'text-slate-400'}`}></i>
                        <span className={`font-bold ${currentUser.theme === 'light' ? 'text-emerald-600' : 'text-slate-500'}`}>Tech Calme (Clair)</span>
                      </div>
                      {currentUser.theme === 'light' && <i className="fas fa-check-circle text-emerald-500"></i>}
                    </button>
                    <button 
                      onClick={() => updateProfile({ theme: 'dark' })}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentUser.theme === 'dark' ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent bg-slate-800/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <i className={`fas fa-moon ${currentUser.theme === 'dark' ? 'text-emerald-500' : 'text-slate-400'}`}></i>
                        <span className={`font-bold ${currentUser.theme === 'dark' ? 'text-emerald-100' : 'text-slate-500'}`}>Dark Soft (Sombre)</span>
                      </div>
                      {currentUser.theme === 'dark' && <i className="fas fa-check-circle text-emerald-500"></i>}
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
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${currentUser.unit === 'celsius' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400'}`}
                        >
                          Celsius (°C)
                        </button>
                        <button 
                          onClick={() => updateProfile({ unit: 'fahrenheit' })}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${currentUser.unit === 'fahrenheit' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400'}`}
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

          {view === 'plantes' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <p className="text-slate-400 font-medium">Gérez vos types de cultures et leurs besoins spécifiques.</p>
                <button 
                  onClick={() => setEditingPlant({ id: Math.random().toString(36).substr(2, 9), name: '', humidityMin: 50, humidityMax: 80, tempMin: 15, tempMax: 30, lightMin: 50, phMin: 6, phMax: 7, notes: '' })}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-emerald-100"
                >
                  <i className="fas fa-plus"></i> Nouveau Profil
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plantProfiles.map(plant => (
                  <div key={plant.id} className={`${cardClasses} p-8 rounded-[32px] border group hover:border-emerald-500/50 transition-all`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <i className="fas fa-leaf text-2xl"></i>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingPlant(plant)} className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-emerald-500' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}><i className="fas fa-edit"></i></button>
                      </div>
                    </div>
                    <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{plant.name}</h3>
                    <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{plant.notes}</p>
                    <button 
                      onClick={() => {
                        if (selectedDeviceId) {
                          setDevices(prev => prev.map(d => d.id === selectedDeviceId ? {...d, currentPlantProfileId: plant.id} : d));
                          setView('dashboard');
                        }
                      }}
                      className={`w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-emerald-600 text-slate-100' : 'bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-600'}`}
                    >
                      Appliquer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'config' && selectedDevice && (
            <div className="space-y-8">
              <p className="text-slate-400 font-medium">Configurez les paramètres de la station <span className="text-emerald-500 font-bold">{selectedDevice.name}</span>.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Infos du device */}
                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-600/20">
                      <i className="fas fa-microchip"></i>
                    </div>
                    <div>
                      <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Station</h3>
                      <p className="text-slate-400 text-sm font-medium">Identité et paramètres matériels</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom de la station</label>
                      <input
                        type="text"
                        value={selectedDevice.name}
                        onChange={e => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, name: e.target.value } : d))}
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Emplacement</label>
                      <input
                        type="text"
                        value={selectedDevice.locationLabel}
                        onChange={e => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, locationLabel: e.target.value } : d))}
                        placeholder="Ex: Balcon, Jardin, Bureau..."
                        className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Taille du bac</label>
                        <select
                          value={selectedDevice.size}
                          onChange={e => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, size: e.target.value as any } : d))}
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none cursor-pointer`}
                        >
                          <option value="Petit">Petit (~5L)</option>
                          <option value="Moyen">Moyen (~15L)</option>
                          <option value="Grand">Grand (~40L)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Niveau équipement</label>
                        <select
                          value={selectedDevice.level}
                          onChange={e => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, level: e.target.value as any } : d))}
                          className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none cursor-pointer`}
                        >
                          <option value="Base">Base</option>
                          <option value="Intermédiaire">Intermédiaire</option>
                          <option value="Final">Final</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Automatisation */}
                <section className={`${cardClasses} p-10 rounded-[40px] border shadow-sm space-y-8`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-600/20">
                      <i className="fas fa-robot"></i>
                    </div>
                    <div>
                      <h3 className={`text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Automatisation</h3>
                      <p className="text-slate-400 text-sm font-medium">Arrosage et contrôle automatique</p>
                    </div>
                  </div>

                  {/* Toggle AUTO */}
                  <div className={`flex items-center justify-between p-5 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div>
                      <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Arrosage automatique</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {selectedDevice.automationEnabled
                          ? 'La station arrose automatiquement quand le sol est trop sec.'
                          : 'Désactivé — arrosage manuel uniquement.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, automationEnabled: !d.automationEnabled } : d))}
                      className={`relative w-16 h-9 rounded-full transition-colors duration-300 flex-shrink-0 ${selectedDevice.automationEnabled ? 'bg-emerald-500' : (isDarkMode ? 'bg-slate-700' : 'bg-slate-300')}`}
                    >
                      <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${selectedDevice.automationEnabled ? 'translate-x-8' : 'translate-x-1.5'}`}></div>
                    </button>
                  </div>

                  {/* Capteurs optionnels */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Capteurs activés</p>
                    {[
                      { key: 'hasTempWater', label: 'Sonde température eau', icon: 'fa-faucet-drip' },
                      { key: 'hasPowerMeter', label: 'Mesure de puissance (W)', icon: 'fa-bolt' },
                    ].map(sensor => (
                      <div key={sensor.key} className={`flex items-center justify-between p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          <i className={`fas ${sensor.icon} w-5 text-center ${(selectedDevice.config as any)[sensor.key] ? 'text-emerald-500' : 'text-slate-400'}`}></i>
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{sensor.label}</span>
                        </div>
                        <button
                          onClick={() => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, config: { ...d.config, [sensor.key]: !(d.config as any)[sensor.key] } } : d))}
                          className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${(selectedDevice.config as any)[sensor.key] ? 'bg-emerald-500' : (isDarkMode ? 'bg-slate-700' : 'bg-slate-300')}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${(selectedDevice.config as any)[sensor.key] ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Fréquence d'échantillonnage */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fréquence de mesure</label>
                    <select
                      value={selectedDevice.config.samplingFrequencySec}
                      onChange={e => setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, config: { ...d.config, samplingFrequencySec: +e.target.value } } : d))}
                      className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none cursor-pointer`}
                    >
                      <option value={5}>Toutes les 5 secondes</option>
                      <option value={10}>Toutes les 10 secondes</option>
                      <option value={30}>Toutes les 30 secondes</option>
                      <option value={60}>Toutes les minutes</option>
                    </select>
                  </div>
                </section>
              </div>

              {/* Infos device */}
              <div className={`${cardClasses} p-6 rounded-[32px] border text-center opacity-60`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Informations station</p>
                <p className="text-xs font-bold text-slate-500">Créée le {new Date(selectedDevice.createdAt).toLocaleDateString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">ID : {selectedDevice.id}</p>
              </div>
            </div>
          )}

          {view === 'activities' && (
            <div className="space-y-8">
              <p className="text-slate-400 font-medium">Historique des actions sur toutes vos stations.</p>

              {wateringEvents.length === 0 ? (
                <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                  <i className="fas fa-history text-5xl text-slate-300 mb-6 block"></i>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Aucune activité</p>
                  <p className="text-sm text-slate-400 mt-2">Les arrosages et événements apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Timeline */}
                  {wateringEvents.map((event, idx) => {
                    const deviceInfo = devices.find(d => d.id === event.deviceId);
                    const isAuto = event.mode === WateringMode.AUTO;
                    return (
                      <div key={event.id} className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAuto
                              ? (isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600')
                              : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
                          }`}>
                            <i className={`fas ${isAuto ? 'fa-robot' : 'fa-hand-pointer'} text-sm`}></i>
                          </div>
                          {idx < wateringEvents.length - 1 && (
                            <div className={`w-0.5 flex-1 mt-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                          )}
                        </div>

                        {/* Event card */}
                        <div className={`${cardClasses} flex-1 p-6 rounded-2xl border mb-2`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-black uppercase tracking-wider ${isAuto ? 'text-violet-500' : 'text-blue-500'}`}>
                                {isAuto ? 'AUTO' : 'MANUEL'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                <i className="fas fa-microchip mr-1"></i>{deviceInfo?.name || 'Station'}
                              </span>
                            </div>
                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              <i className="fas fa-stopwatch mr-1 text-xs"></i>{event.durationSec}s
                            </span>
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{event.reason}</p>
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
          )}

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

            // Clic sur une alerte → naviguer vers le dashboard avec le bon device + plante
            const handleAlertClick = (alert: Alert) => {
              // Sélectionner le device de l'alerte
              setSelectedDeviceId(alert.deviceId);
              // Assigner la plante de l'alerte au device pour l'afficher sur le dashboard
              const plant = plantProfiles.find(p => p.name === alert.plantName);
              if (plant) {
                setDevices(prev => prev.map(d =>
                  d.id === alert.deviceId ? { ...d, currentPlantProfileId: plant.id } : d
                ));
              }
              setView('dashboard');
            };

            // Grouper les alertes par device
            const alertsByDevice: Record<string, Alert[]> = {};
            alerts.forEach(a => {
              if (!alertsByDevice[a.deviceId]) alertsByDevice[a.deviceId] = [];
              alertsByDevice[a.deviceId].push(a);
            });
            // Trier chaque groupe par sévérité (critical > warning > info) puis timestamp
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            Object.values(alertsByDevice).forEach(group =>
              group.sort((a, b) => severityOrder[a.type] - severityOrder[b.type] || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            );

            return (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-slate-400 font-medium">
                    {alerts.length > 0
                      ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} active${alerts.length > 1 ? 's' : ''} sur ${Object.keys(alertsByDevice).length} station${Object.keys(alertsByDevice).length > 1 ? 's' : ''}`
                      : 'Aucune alerte active'}
                  </p>
                  {alerts.length > 0 && (
                    <button
                      onClick={() => setAlerts([])}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-100 text-rose-500 hover:bg-rose-50'}`}
                    >
                      <i className="fas fa-trash mr-2"></i>Tout effacer
                    </button>
                  )}
                </div>

                {alerts.length === 0 ? (
                  <div className={`${cardClasses} p-16 rounded-[32px] border text-center`}>
                    <i className="fas fa-check-circle text-5xl text-emerald-400 mb-6 block"></i>
                    <p className={`text-xl font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tout va bien</p>
                    <p className="text-sm text-slate-400 mt-2">Aucune alerte active. Toutes vos plantes sont dans les seuils.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(alertsByDevice).map(([deviceId, deviceAlerts]) => {
                      const deviceInfo = devices.find(d => d.id === deviceId);
                      return (
                        <div key={deviceId}>
                          {/* En-tête du device */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              <i className={`fas fa-microchip text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}></i>
                            </div>
                            <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              {deviceInfo?.name || 'Station inconnue'}
                            </h3>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                              {deviceAlerts.length} alerte{deviceAlerts.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Alertes du device */}
                          <div className="space-y-3">
                            {deviceAlerts.map(alert => (
                              <div
                                key={alert.id}
                                onClick={() => handleAlertClick(alert)}
                                className={`${alertBg(alert.type)} border rounded-2xl p-5 flex items-start gap-4 cursor-pointer transition-all hover:scale-[1.005] hover:shadow-lg group`}
                              >
                                <div className="pt-0.5">
                                  <i className={`fas ${alertIcon(alert.type)} text-lg`}></i>
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
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                      <i className="fas fa-seedling mr-1"></i>{alert.plantName}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/70 text-slate-500'}`}>
                                      <i className={`fas ${categoryIcon(alert.category)} mr-1`}></i>{alert.category}
                                    </span>
                                  </div>
                                  <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{alert.message}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <p className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleString()}</p>
                                    <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                      <i className="fas fa-arrow-right mr-1"></i>Voir le dashboard
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
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
                  className={`w-full ${inputClasses} rounded-2xl p-4 pl-11 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
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
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${isDarkMode ? 'hover:bg-emerald-600/20' : 'hover:bg-emerald-50'} ${i > 0 ? (isDarkMode ? 'border-t border-slate-700' : 'border-t border-slate-100') : ''}`}
                    >
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {commonName ? <>{commonName} <span className="font-normal italic text-slate-400 text-xs">({cp.name})</span></> : cp.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{cp.category}{cp.origin ? ` — ${cp.origin}` : ''}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-slate-400">{cp.temp_min}–{cp.temp_max}°C</p>
                        <p className="text-[10px] text-emerald-500 font-bold">Hum {cp.humidity_min}–{cp.humidity_max}%</p>
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
                  className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
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
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'humidity' ? 'text-emerald-500' : 'text-slate-300'}`}></i>
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
                    <input type="number" min="0" max="100" value={editingPlant.humidityMin} onChange={e => setEditingPlant({ ...editingPlant, humidityMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Maximum</span>
                    <input type="number" min="0" max="100" value={editingPlant.humidityMax} onChange={e => setEditingPlant({ ...editingPlant, humidityMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
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
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'temp' ? 'text-emerald-500' : 'text-slate-300'}`}></i>
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
                    <input type="number" value={editingPlant.tempMin} onChange={e => setEditingPlant({ ...editingPlant, tempMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Maximum</span>
                    <input type="number" value={editingPlant.tempMax} onChange={e => setEditingPlant({ ...editingPlant, tempMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
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
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'light' ? 'text-emerald-500' : 'text-slate-300'}`}></i>
                  </button>
                  {openTooltip === 'light' && (
                    <div className={`absolute left-0 top-full mt-2 z-10 w-72 p-3 rounded-xl text-xs shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                      Intensité lumineuse minimale. <strong>30-40%</strong> = mi-ombre (salades, menthe), <strong>60-80%</strong> = plein soleil (tomates, piments). En dessous, les LEDs horticoles s'activeront automatiquement.
                    </div>
                  )}
                </div>
                <input type="number" min="0" max="100" value={editingPlant.lightMin} onChange={e => setEditingPlant({ ...editingPlant, lightMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
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
                    <i className={`fas fa-circle-info text-[10px] transition-colors ${openTooltip === 'ph' ? 'text-emerald-500' : 'text-slate-300'}`}></i>
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
                    <input type="number" step="0.1" min="0" max="14" value={editingPlant.phMin} onChange={e => setEditingPlant({ ...editingPlant, phMin: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Maximum</span>
                    <input type="number" step="0.1" min="0" max="14" value={editingPlant.phMax} onChange={e => setEditingPlant({ ...editingPlant, phMax: +e.target.value })} className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500`} />
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
                  className={`w-full ${inputClasses} rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 resize-none`}
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
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
