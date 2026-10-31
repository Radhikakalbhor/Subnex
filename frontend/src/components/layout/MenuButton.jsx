import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * MenuButton - Exact recreation of the reference pill button:
 * Dark charcoal/black surface, dual-bar white menu icon, and "Menu" typography.
 */
export function MenuButton({
  isOpen = false,
  onClick,
  onMouseEnter,
  className,
  showLabel = true,
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Collapse navigation' : 'Expand navigation'}
      className={cn(
        'inline-flex items-center space-x-2.5 px-3.5 py-2 rounded-full bg-[#121316] text-white shadow-[0_4px_16px_rgba(0,0,0,0.14)] hover:bg-[#1C1D22] border border-white/[0.08] transition-all cursor-pointer select-none group',
        className
      )}
    >
      {/* 2-line Minimal Menu Icon matching reference screenshot */}
      <div className="flex flex-col space-y-[3.5px] justify-center items-center w-3.5 flex-shrink-0">
        <motion.span
          animate={{
            rotate: isOpen ? 45 : 0,
            y: isOpen ? 5 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-[1.75px] bg-white rounded-full group-hover:w-4 transition-all"
        />
        <motion.span
          animate={{
            opacity: isOpen ? 0 : 1,
            scaleX: isOpen ? 0 : 1,
          }}
          transition={{ duration: 0.15 }}
          className="w-3.5 h-[1.75px] bg-white rounded-full group-hover:w-4 transition-all"
        />
        {isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{
              rotate: -45,
              y: -5,
              opacity: 1,
            }}
            transition={{ duration: 0.2 }}
            className="w-3.5 h-[1.75px] bg-white rounded-full"
          />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-tight text-white">
          {isOpen ? 'Close' : 'Menu'}
        </span>
      )}
    </motion.button>
  );
}

export default MenuButton;
