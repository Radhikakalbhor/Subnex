import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { cn } from '../../lib/utils';

export function ContinuousTabs({
  tabs = [],
  activeId,
  onChange,
  className,
  size = 'md',
  layoutGroupId = 'continuous-tabs-group',
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <LayoutGroup id={layoutGroupId}>
      <nav
        className={cn(
          'relative inline-flex items-center gap-1 p-1 rounded-full',
          'bg-[#F5F6F8] border border-black/[0.05]',
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center justify-center font-medium rounded-full outline-none transition-colors duration-150 select-none z-10',
                sizeClasses[size] || sizeClasses.md,
                isActive
                  ? 'text-neutral-900 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`${layoutGroupId}-active-pill`}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.04]"
                />
              )}

              <span className="relative z-10 flex items-center space-x-1.5">
                {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      'ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase',
                      isActive ? 'bg-neutral-900 text-white' : 'bg-black/[0.06] text-neutral-600'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

