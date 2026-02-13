
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, Device, PlantProfile, SensorReading, Alert, Role, 
  WateringMode, WateringEvent, SensorStatus, Recommendation, AlertType, ThemeType, UnitType, LanguageType
} from './types';
import { INITIAL_PLANTS, INITIAL_DEVICES, MOCK_USER } from './constants';
import SensorCard from './components/SensorCard';
import HistoryChart from './components/HistoryChart';
import WeatherWidget from './components/WeatherWidget';
import Landing from './components/Landing';
import Auth from './components/Auth';

const App: React.FC = () => {
  // --- Routing & Auth State ---
  const [page, setPage] = useState<'landing' | 'login' | 'register' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Main App State ---
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(INITIAL_DEVICES[0].id);
  const [plantProfiles, setPlantProfiles] = useState<PlantProfile[]>(INITIAL_PLANTS);
  const [history, setHistory] = useState<Record<string, SensorReading[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [wateringEvents, setWateringEvents] = useState<WateringEvent[]>([]);
  const [view, setView] = useState<'dashboard' | 'plantes' | 'alerts' | 'config' | 'activities' | 'profil'>('dashboard');

  // --- Profile Page State ---
  const [profileForm, setProfileForm] = useState<Partial<User>>({});
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // --- Plant CRUD State ---
  const [editingPlant, setEditingPlant] = useState<PlantProfile | null>(null);

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

  // --- Effects ---
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

  // --- Simulation Engine ---
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

    const interval = setInterval(() => {
      setHistory(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const deviceHistory = [...next[id]];
          const lastReading = deviceHistory[deviceHistory.length - 1];
          const newReading = generateReading(id, lastReading);
          deviceHistory.push(newReading);
          if (deviceHistory.length > 60) deviceHistory.shift();
          next[id] = deviceHistory;
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [devices, generateReading]);

  // --- Actions ---
  const handleAuthSuccess = (email: string) => {
    setCurrentUser({ ...MOCK_USER, email });
    setPage('app');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage('landing');
    setView('dashboard');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const newUser = { ...currentUser, ...updates };
    setCurrentUser(newUser);
    setStatusMsg({ text: 'Profil mis à jour avec succès.', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      setStatusMsg({ text: 'Les mots de passe ne correspondent pas.', type: 'error' });
      return;
    }
    setStatusMsg({ text: 'Mot de passe modifié.', type: 'success' });
    setPasswordForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const triggerWatering = (deviceId: string, mode: WateringMode, reason: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: true } : d));
    const event: WateringEvent = {
      id: Math.random().toString(36).substr(2, 9),
      deviceId, timestamp: new Date().toISOString(),
      mode, durationSec: 15, reason
    };
    setWateringEvents(prev => [event, ...prev]);
    setTimeout(() => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isWatering: false, lastWatering: new Date().toISOString() } : d));
    }, 15000);
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
            { id: 'alerts', icon: 'fa-bell', label: 'Alertes', badge: alerts.filter(a=>!a.read).length },
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

          {/* Other views omitted for brevity, keeping dashboard functionality */}
        </div>
      </main>
    </div>
  );
};

export default App;
