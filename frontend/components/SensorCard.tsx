
import React from 'react';
import { SensorStatus } from '../types';
import { t, type Lang } from '../i18n';

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  status: SensorStatus;
  targetRange?: string;
  icon: string;
  hidden?: boolean;
  isDark?: boolean;
  lang?: Lang;
}

const SensorCard: React.FC<SensorCardProps> = ({ label, value, unit, status, targetRange, icon, hidden, isDark, lang = 'FR' as Lang }) => {
  if (hidden) return null;

  const statusStyles = {
    ok: isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700',
    low: isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-700',
    high: isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700',
    neutral: isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
  };

  const statusLabels = {
    ok: t('dash_status_conforme', lang),
    low: t('dash_status_trop_bas', lang),
    high: t('dash_status_trop_haut', lang),
    neutral: t('dash_status_inactif', lang),
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-40 ${statusStyles[status]}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/40'} border shadow-sm`}>
            <i className={`fas ${icon} text-lg`}></i>
          </div>
          <span className="font-semibold text-sm uppercase tracking-wide opacity-80">{label}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDark ? 'bg-white/10 border-white/5' : 'bg-white/50 border-white/20'}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{value.toFixed(1)}</span>
          <span className="text-sm font-medium opacity-60 uppercase">{unit}</span>
        </div>
        {targetRange && (
          <p className="text-[10px] mt-2 font-medium opacity-50 flex items-center gap-1">
            <i className="fas fa-bullseye"></i> Target: {targetRange}
          </p>
        )}
      </div>
    </div>
  );
};

export default SensorCard;
