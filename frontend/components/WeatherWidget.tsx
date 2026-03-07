
import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
  isDark?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ isDark }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=45.75&longitude=4.85&current_weather=true&daily=precipitation_probability_max&timezone=auto');
        const data = await res.json();
        
        setWeather({
          temp: data.current_weather.temperature,
          description: "Variable",
          icon: "fa-cloud-sun",
          precipProb: data.daily.precipitation_probability_max[0]
        });
      } catch (e) {
        console.error("Weather fetch failed", e);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) return <div className={`h-24 animate-pulse rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}></div>;

  const needsLessWater = weather && weather.precipProb > 50;

  return (
    <div className={`p-6 rounded-2xl shadow-lg text-white relative overflow-hidden transition-all ${isDark ? 'bg-gradient-to-br from-indigo-600 to-slate-900' : 'bg-gradient-to-br from-sky-500 to-blue-600'}`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-white/80 font-medium text-sm">Lyon, France</h3>
            <div className="text-4xl font-bold mt-1">{weather?.temp}°C</div>
          </div>
          <i className={`fas ${weather?.icon} text-4xl text-white/40`}></i>
        </div>
        <div className="mt-4 flex items-center gap-3">
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
