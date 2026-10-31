import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import GlassSurface from './GlassSurface';

/**
 * BorderGlow - Interactive edge-sensing glow container from React Bits.
 * Tracks pointer direction and intensifies a mesh/conic gradient border when cursor nears the edges.
 * Integrated with GlassSurface for Apple-grade frosted liquid glass refraction with crisp typography.
 */
export const BorderGlow = ({
  children,
  className = '',
  contentClassName = '',
  edgeSensitivity = 30,
  coneSpread = 25,
  glowColor = '40 80 80',
  backgroundColor = 'rgba(255, 255, 255, 0.55)',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  glass = true,
  backgroundOpacity = 0.55,
  style = {},
  ...props
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate distance to closest edge
      const distanceFromLeft = x;
      const distanceFromRight = rect.width - x;
      const distanceFromTop = y;
      const distanceFromBottom = rect.height - y;

      const minDistance = Math.min(
        distanceFromLeft,
        distanceFromRight,
        distanceFromTop,
        distanceFromBottom
      );

      // Proximity intensity scaling
      const maxDist = (rect.width + rect.height) * (edgeSensitivity / 200);
      let intensity = 1 - Math.min(minDistance / Math.max(maxDist, 1), 1);
      intensity = Math.max(0, Math.min(1, intensity)) * glowIntensity;

      // Angle from center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const angle = (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;

      container.style.setProperty('--mouse-x', `${x}px`);
      container.style.setProperty('--mouse-y', `${y}px`);
      container.style.setProperty('--glow-angle', `${angle}deg`);
      container.style.setProperty('--edge-intensity', `${intensity}`);
    };

    const handleMouseLeave = () => {
      container.style.setProperty('--edge-intensity', '0');
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [edgeSensitivity, glowIntensity]);

  return (
    <div
      ref={containerRef}
      className={cn('border-glow-wrapper group/glow', animated && 'border-glow-animated', className)}
      style={{
        '--border-radius': `${borderRadius}px`,
        '--glow-radius': `${glowRadius}px`,
        '--bg-color': backgroundColor,
        '--cone-spread': `${coneSpread}%`,
        '--glow-color': glowColor,
        '--color-1': colors[0] || '#c084fc',
        '--color-2': colors[1] || '#f472b6',
        '--color-3': colors[2] || '#38bdf8',
        ...style,
      }}
      {...props}
    >
      {/* Outer ambient glow */}
      <div className="border-glow-ambient" />

      {/* Conic mask border layer */}
      <div className="border-glow-effect" />

      {/* Actual inner card content with GlassSurface for Apple-grade frosted glass */}
      <div className={cn('border-glow-content', contentClassName)}>
        {glass ? (
          <GlassSurface
            borderRadius={Math.max(12, borderRadius - 2)}
            backgroundOpacity={backgroundOpacity}
            distortionScale={-180}
            displace={0.5}
            blur={11}
            refractive
            className="w-full h-full"
          >
            {children}
          </GlassSurface>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export const BorderGlowCard = ({
  children,
  className = '',
  contentClassName = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = 'rgba(255, 255, 255, 0.55)',
  borderRadius = 22,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  glass = true,
  backgroundOpacity = 0.55,
  ...props
}) => {
  return (
    <BorderGlow
      edgeSensitivity={edgeSensitivity}
      glowColor={glowColor}
      backgroundColor={backgroundColor}
      borderRadius={borderRadius}
      glowRadius={glowRadius}
      glowIntensity={glowIntensity}
      coneSpread={coneSpread}
      animated={animated}
      colors={colors}
      glass={glass}
      backgroundOpacity={backgroundOpacity}
      className={cn('border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)]', className)}
      contentClassName={contentClassName}
      {...props}
    >
      {children}
    </BorderGlow>
  );
};

export default BorderGlow;
