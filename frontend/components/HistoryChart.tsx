
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SensorReading } from '../types';
import { t, type Lang } from '../i18n';

interface HistoryChartProps {
  data: SensorReading[];
  isDark?: boolean;
  lang?: Lang;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, isDark, lang = 'FR' }) => {
  const formattedData = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div className={`w-full h-80 p-4 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
      <h3 className={`text-lg font-semibold mb-4 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('chart_title', lang)}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: textColor }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fontSize: 10, fill: textColor }} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="tempAir" 
            name="Temp. Air" 
            stroke="#f59e0b" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="humidity" 
            name={t('chart_humidity', lang)}
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="soilPh" 
            name={t('chart_ph', lang)}
            stroke="#10b981" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
