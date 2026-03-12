
import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
  isDark?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ isDark }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Votre position');

  useEffect(() => {
    const fetchWeatherByCoords = async (lat: number, lon: number, cityName: string) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=precipitation_probability_max&timezone=auto`
        );
        const data = await res.json();
        const wc = data.current_weather?.weathercode ?? 0;
        let icon = 'fa-sun';
        if (wc >= 61 && wc <= 82) icon = 'fa-cloud-rain';
        else if (wc >= 51 && wc <= 57) icon = 'fa-cloud-drizzle';
        else if (wc >= 1 && wc <= 3) icon = 'fa-cloud-sun';
        else if (wc >= 45 && wc <= 48) icon = 'fa-smog';
        else if (wc >= 71 && wc <= 77) icon = 'fa-snowflake';
        setCity(cityName);
        setWeather({
          temp: data.current_weather.temperature,
          description: 'Variable',
          icon,
          precipProb: data.daily?.precipitation_probability_max?.[0] ?? 0,
          city: cityName,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    // Try browser geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode via Open-Meteo geocoding (no key needed)
          let cityName = 'Votre position';
          try {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const geoData = await geo.json();
            cityName =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              geoData.address?.county ||
              'Votre position';
          } catch { /* use default */ }
          fetchWeatherByCoords(latitude, longitude, cityName);
        },
        () => {
          // Geolocation denied or unavailable → fallback to Marseille
          fetchWeatherByCoords(43.30, 5.37, 'Marseille');
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeatherByCoords(43.30, 5.37, 'Marseille');
    }
  }, []);

  if (loading) return <div className={`h-24 animate-pulse rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}></div>;

  const needsLessWater = weather && weather.precipProb > 50;

  return (
    <div className={`p-6 rounded-2xl shadow-lg text-white relative overflow-hidden transition-all ${isDark ? 'bg-gradient-to-br from-green-700 to-slate-900' : 'bg-gradient-to-br from-sky-500 to-blue-600'}`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-white/80 font-medium text-sm flex items-center gap-1">
              <i className="fas fa-location-dot text-xs"></i>
              {city}
            </h3>
            <div className="text-4xl font-bold mt-1">{weather?.temp}°C</div>
          </div>
          <i className={`fas ${weather?.icon} text-4xl text-white/40`}></i>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
            <i className="fas fa-droplet mr-2"></i>
            {weather?.precipProb}% pluie
          </div>
          {needsLessWater && (
            <div className="bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Arrosage réduit conseillé
            </div>
          )}
        </div>
      </div>
      <div className="absolute -right-10 -bottom-10 opacity-10">
        <i className="fas fa-cloud-sun text-[150px]"></i>
      </div>
    </div>
  );
};

export default WeatherWidget;
