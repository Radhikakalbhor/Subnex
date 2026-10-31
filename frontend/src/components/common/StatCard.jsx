import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'indigo',
  badgeText,
  badgeType = 'default',
}) {
  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:border-black/[0.09] transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-full bg-[#F5F6F8] border border-black/[0.04] text-neutral-700 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline space-x-2.5">
          <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            {value}
          </span>
          {badgeText && (
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium tracking-tight ${
                badgeType === 'danger'
                  ? 'bg-rose-500/[0.1] text-rose-700 border border-rose-500/20'
                  : 'bg-emerald-500/[0.1] text-emerald-700 border border-emerald-500/20'
              }`}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtext && (
          <p className="mt-1.5 text-xs text-neutral-500 font-normal leading-relaxed">{subtext}</p>
        )}
      </div>
    </div>
  );
}
