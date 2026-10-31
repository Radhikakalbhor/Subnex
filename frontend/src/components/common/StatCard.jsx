import React from 'react';
import BorderGlow from './BorderGlow';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'indigo',
  badgeText,
  badgeType = 'default',
  backgroundColor = 'rgba(255, 255, 255, 0.52)',
  backgroundOpacity = 0.52,
  borderRadius = 22,
}) {
  return (
    <BorderGlow
      edgeSensitivity={30}
      glowColor="40 80 80"
      backgroundColor={backgroundColor}
      backgroundOpacity={backgroundOpacity}
      borderRadius={borderRadius}
      glowRadius={40}
      glowIntensity={1}
      coneSpread={25}
      animated={false}
      colors={['#c084fc', '#f472b6', '#38bdf8']}
      className="h-full border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className="w-9 h-9 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-neutral-800 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline space-x-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
              {value}
            </span>
            {badgeText && (
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold tracking-tight shadow-sm ${
                  badgeType === 'danger'
                    ? 'bg-rose-500/[0.15] text-rose-800 border border-rose-500/30'
                    : 'bg-emerald-500/[0.15] text-emerald-800 border border-emerald-500/30'
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtext && (
            <p className="mt-1.5 text-xs text-neutral-700 font-medium leading-relaxed">{subtext}</p>
          )}
        </div>
      </div>
    </BorderGlow>
  );
}
