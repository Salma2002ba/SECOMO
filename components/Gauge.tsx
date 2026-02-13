
import React from 'react';

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  color: string;
  icon: string;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, unit, min, max, color, icon }) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="relative flex items-center justify-center mb-2">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-100"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
          <i className={`${icon} text-lg mb-1`} style={{ color }}></i>
          <span className="text-xl font-bold">{value.toFixed(1)}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">{unit}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
  );
};

export default Gauge;
