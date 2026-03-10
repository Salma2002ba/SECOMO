import React from 'react';
import { t, type Lang } from '../i18n';

interface WaterTankCardProps {
  level: number;
  capacityLiters: number;
  isDark?: boolean;
  lang?: Lang;
}

const WaterTankCard: React.FC<WaterTankCardProps> = ({ level, capacityLiters, isDark, lang = 'FR' as Lang }) => {
  const clampedLevel = Math.min(100, Math.max(0, level));
  const litersRemaining = (clampedLevel / 100) * capacityLiters;
  const status = clampedLevel < 10 ? 'critical' : clampedLevel < 30 ? 'low' : 'ok';

  const waterColor = status === 'critical' ? '#ef4444'
                   : status === 'low'      ? '#fbbf24'
                   :                         '#06b6d4';

  const statusLabel = {
    ok:       { FR: 'Réservoir OK', EN: 'Tank OK' },
    low:      { FR: 'Niveau Bas',   EN: 'Low Level' },
    critical: { FR: 'Critique',     EN: 'Critical' },
  }[status][lang];

  const border    = isDark ? 'border-slate-800' : 'border-slate-100';
  const cardBg    = isDark ? 'bg-slate-900' : 'bg-white';
  const textMain  = isDark ? 'text-slate-100' : 'text-slate-800';
  const textSub   = isDark ? 'text-slate-400'  : 'text-slate-500';
  const iconColor = status === 'critical' ? 'text-rose-500' : status === 'low' ? 'text-amber-500' : 'text-cyan-500';
  const badgeBg   = status === 'critical' ? 'bg-rose-500/20'  : status === 'low' ? 'bg-amber-400/20'  : 'bg-cyan-500/20';
  const badgeTxt  = status === 'critical' ? (isDark ? 'text-rose-300'  : 'text-rose-600')
                  : status === 'low'      ? (isDark ? 'text-amber-300' : 'text-amber-600')
                  :                         (isDark ? 'text-cyan-300'  : 'text-cyan-700');

  // Wave baseline in viewBox units (viewBox height = 100)
  // waveY = distance from top = (100 - level)
  const waveY = 100 - clampedLevel;
  const a = 4; // amplitude in viewBox units

  // Each wave path spans 2 full periods (0→800) for seamless -400 loop
  // Period = 400 viewBox units, fills down to y=100
  const frontPath = [
    `M0,${waveY}`,
    `C50,${waveY-a} 100,${waveY+a} 150,${waveY}`,
    `C200,${waveY-a} 250,${waveY+a} 300,${waveY}`,
    `C350,${waveY-a} 400,${waveY+a} 450,${waveY}`,
    `C500,${waveY-a} 550,${waveY+a} 600,${waveY}`,
    `C650,${waveY-a} 700,${waveY+a} 750,${waveY}`,
    `C800,${waveY-a} 800,${waveY} 800,${waveY}`,
    `L800,100 L0,100 Z`,
  ].join(' ');

  // Back wave: phase offset by 200 (half period), slightly different amplitude
  const b = 3;
  const backPath = [
    `M0,${waveY+1}`,
    `C50,${waveY+1+b} 100,${waveY+1-b} 150,${waveY+1}`,
    `C200,${waveY+1+b} 250,${waveY+1-b} 300,${waveY+1}`,
    `C350,${waveY+1+b} 400,${waveY+1-b} 450,${waveY+1}`,
    `C500,${waveY+1+b} 550,${waveY+1-b} 600,${waveY+1}`,
    `C650,${waveY+1+b} 700,${waveY+1-b} 750,${waveY+1}`,
    `C800,${waveY+1+b} 800,${waveY+1} 800,${waveY+1}`,
    `L800,100 L0,100 Z`,
  ].join(' ');

  return (
    <div className={`relative p-5 rounded-2xl border h-40 flex flex-col justify-between overflow-hidden ${cardBg} ${border}`}>

      {/*
        Single SVG covering the entire card.
        Both wave paths live in the same SVG element — zero boundary artifacts.
        animateTransform uses SVG user units (400 = one full period) → seamless loop.
      */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ transition: 'opacity 0.8s' }}
      >
        {/* Back wave — slower, semi-transparent */}
        <path d={backPath} fill={waterColor} fillOpacity="0.35">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; -400,0"
            dur="5s"
            repeatCount="indefinite"
          />
        </path>

        {/* Front wave — faster, opaque */}
        <path d={frontPath} fill={waterColor} fillOpacity="0.78">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-400,0; 0,0"
            dur="3.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>

      {/* Content */}
      <div className="relative z-10 flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center`}
            style={{ background: `${waterColor}40` }}>
            <i className={`fas fa-fill-drip text-lg drop-shadow ${isDark ? 'text-white' : 'text-slate-700'}`} />
          </div>
          <span className={`font-semibold text-sm uppercase tracking-wide opacity-80 ${textMain}`}>
            {t('tank_label', lang)}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg} ${badgeTxt}`}>
          {statusLabel}
        </span>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold tracking-tight ${textMain}`}>{clampedLevel.toFixed(0)}</span>
          <span className={`text-sm font-medium opacity-60 ${textMain}`}>%</span>
        </div>
        <p className={`text-[10px] mt-1 font-medium opacity-70 flex items-center gap-1 ${textSub}`}>
          <i className="fas fa-droplet" />
          {litersRemaining.toFixed(1)} L / {capacityLiters} L
        </p>
      </div>
    </div>
  );
};

export default WaterTankCard;
