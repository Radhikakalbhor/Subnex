import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function ShimmerButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm',
  };

  const variantClasses = {
    primary:
      'bg-neutral-900 text-white hover:bg-black shadow-[0_2px_10px_rgba(0,0,0,0.12)] border border-neutral-800',
    secondary:
      'bg-[#F5F6F8] text-neutral-800 hover:bg-[#EAEBED] border border-black/[0.06] shadow-xs',
    outline:
      'bg-transparent text-neutral-800 border border-black/[0.12] hover:bg-black/[0.03]',
  };

  return (
    <motion.button
      type={type}
      whileHover={!disabled ? { scale: 1.015 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold overflow-hidden transition-all duration-200 select-none group',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.primary,
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center">{children}</span>
      
      {/* Watermelon Shimmer Light Beam Effect */}
      <span
        aria-hidden="true"
        className="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
      />
    </motion.button>
  );
}

