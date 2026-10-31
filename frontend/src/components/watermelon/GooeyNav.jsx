import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * GooeyNav - Liquid particle gooey navigation
 * Features SVG blur + contrast matrix filter with dynamic particle droplets
 * that flow and melt between active navigation buttons.
 */
export default function GooeyNav({
  items = [],
  activeId,
  initialActiveIndex = 0,
  theme = 'dark',
  size = 'md',
  frame = false,
  particleCount = 15,
  spread = 56,
  animationTime = 600,
  timeVariance = 300,
  gooeyness = 0.5,
  wobble = 0.5,
  hoverEffect = true,
  onChange,
  renderItem,
}) {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  // Find active index based on activeId or initialActiveIndex
  const getIndex = () => {
    if (activeId !== undefined) {
      const idx = items.findIndex((it) => it.id === activeId);
      return idx !== -1 ? idx : 0;
    }
    return initialActiveIndex;
  };

  const [activeIndex, setActiveIndex] = useState(getIndex);
  const [prevIndex, setPrevIndex] = useState(getIndex);
  const [pillRect, setPillRect] = useState({ top: 0, height: 48, width: '100%' });
  const [particles, setParticles] = useState([]);
  const [isWobbling, setIsWobbling] = useState(false);
  const filterId = useRef(`gooey-filter-${Math.random().toString(36).substring(2, 9)}`).current;

  // Sync activeIndex if activeId prop changes
  useEffect(() => {
    if (activeId !== undefined) {
      const newIdx = items.findIndex((it) => it.id === activeId);
      if (newIdx !== -1 && newIdx !== activeIndex) {
        triggerTransition(newIdx);
      }
    }
  }, [activeId]);

  // Update pill coordinates based on target item ref
  const updatePillRect = (idx) => {
    const el = itemRefs.current[idx];
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPillRect({
        top: elRect.top - containerRect.top,
        height: elRect.height,
        width: elRect.width,
      });
    }
  };

  useEffect(() => {
    updatePillRect(activeIndex);
    const handleResize = () => updatePillRect(activeIndex);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex]);

  const triggerTransition = (targetIndex) => {
    if (targetIndex === activeIndex) return;

    const fromIdx = activeIndex;
    const toIdx = targetIndex;
    setPrevIndex(fromIdx);
    setActiveIndex(toIdx);

    const fromEl = itemRefs.current[fromIdx];
    const toEl = itemRefs.current[toIdx];
    const container = containerRef.current;

    if (fromEl && toEl && container) {
      const containerRect = container.getBoundingClientRect();
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const startY = fromRect.top - containerRect.top + fromRect.height / 2;
      const endY = toRect.top - containerRect.top + toRect.height / 2;
      const startX = fromRect.width / 2;

      // Generate animated liquid particles
      const newParticles = Array.from({ length: particleCount }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / particleCount;
        const radius = (Math.random() * spread) / 2;
        const xOffset = Math.cos(angle) * radius;
        const duration = (animationTime + (Math.random() - 0.5) * timeVariance) / 1000;
        const delay = (Math.random() * 0.15);
        const particleSize = 8 + Math.random() * 12;

        return {
          id: `${Date.now()}-${i}`,
          startX: startX + xOffset,
          startY,
          endX: startX + (Math.random() - 0.5) * (spread / 3),
          endY,
          duration,
          delay,
          size: particleSize,
        };
      });

      setParticles(newParticles);
      setIsWobbling(true);

      // Clear particles after animation completes
      setTimeout(() => {
        setParticles([]);
        setIsWobbling(false);
      }, animationTime + timeVariance);
    }

    if (onChange) {
      onChange(targetIndex, items[targetIndex]);
    }
  };

  const handleItemClick = (index, item) => {
    triggerTransition(index);
  };

  const stdDev = 7 * (gooeyness || 0.5);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${frame ? 'p-1 rounded-[24px] bg-black/[0.02]' : ''}`}
    >
      {/* SVG Gooey Filter Definition */}
      <svg
        className="absolute pointer-events-none opacity-0 -z-50"
        style={{ width: 0, height: 0, position: 'absolute' }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={stdDev} result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Gooey Liquid Particle Layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0 overflow-visible"
        style={{ filter: `url(#${filterId})` }}
      >
        {/* Active Pill Backdrop with Elastic Wobble */}
        <motion.div
          animate={{
            top: pillRect.top,
            height: pillRect.height,
            scaleY: isWobbling ? [1, 1 + 0.12 * wobble, 1 - 0.08 * wobble, 1] : 1,
            scaleX: isWobbling ? [1, 1 - 0.05 * wobble, 1 + 0.04 * wobble, 1] : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 32,
            duration: animationTime / 1000,
          }}
          className={`absolute left-0 right-0 rounded-[22px] shadow-[0_4px_18px_rgba(0,0,0,0.14)] ${
            theme === 'dark' ? 'bg-[#121316]' : 'bg-neutral-900'
          }`}
          style={{ width: '100%' }}
        />

        {/* Traveling Liquid Droplet Particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.startX,
              y: p.startY,
              scale: 0.8,
              opacity: 0.9,
            }}
            animate={{
              x: p.endX,
              y: p.endY,
              scale: [0.8, 1.4, 0],
              opacity: [0.9, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`absolute rounded-full pointer-events-none ${
              theme === 'dark' ? 'bg-[#121316]' : 'bg-neutral-900'
            }`}
            style={{
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
          />
        ))}
      </div>

      {/* Nav Buttons List */}
      <nav className="relative z-10 flex flex-col space-y-2">
        {items.map((item, idx) => {
          const isActive = activeIndex === idx;

          if (renderItem) {
            return (
              <div
                key={item.id || idx}
                ref={(el) => (itemRefs.current[idx] = el)}
                onClick={() => handleItemClick(idx, item)}
              >
                {renderItem(item, isActive, idx)}
              </div>
            );
          }

          return (
            <button
              key={item.id || idx}
              ref={(el) => (itemRefs.current[idx] = el)}
              type="button"
              onClick={() => handleItemClick(idx, item)}
              className={`w-full flex items-center justify-between transition-all duration-150 rounded-[22px] text-left cursor-pointer select-none ${
                isActive
                  ? 'text-white px-3.5 py-3'
                  : 'text-neutral-800 hover:text-neutral-950 px-3.5 py-2.5'
              }`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                {item.icon && <div className="flex-shrink-0">{item.icon}</div>}
                <span
                  className={`text-sm tracking-tight truncate ${
                    isActive ? 'text-white font-bold' : 'text-neutral-900 font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-2 flex-shrink-0 bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
