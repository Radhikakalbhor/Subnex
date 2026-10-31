import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GooeyNav from '../watermelon/GooeyNav';
import {
  LayoutGrid,
  Layers,
  FileText,
  CreditCard,
  Users,
  ShieldCheck,
  LogOut,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({
  currentView,
  onSelectView,
  overdueCount = 0,
  isOpen: controlledIsOpen,
  onToggleOpen: controlledOnToggleOpen,
}) {
  const { user, isAdmin, isStaff, isCustomer, logout } = useAuth();

  // Internal state if not controlled externally
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnToggleOpen !== undefined ? controlledOnToggleOpen : setInternalIsOpen;

  // Handle clicking outside to shrink back when not pinned
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        !isPinned &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        // Check if event target was the navbar menu button to avoid toggle race
        const isMenuBtn = event.target.closest('button[aria-label="Collapse navigation"], button[aria-label="Expand navigation"]');
        if (!isMenuBtn) {
          setIsOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isOpen, isPinned, setIsOpen]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 400);
    }
  };

  const toggleOpen = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(!isOpen);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview & KPIs',
      iconName: 'LayoutGrid',
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      iconName: 'Layers',
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'invoices',
      label: 'Invoices',
      iconName: 'FileText',
      badge: overdueCount > 0 ? `${overdueCount} due` : null,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'payments',
      label: 'Payments & Audit',
      iconName: 'CreditCard',
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'customers',
      label: 'Customer Registry',
      iconName: 'Users',
      roles: ['admin', 'staff'],
    },
  ];

  const allowedItems = navItems.filter((item) =>
    item.roles.includes(user?.role || 'customer')
  );

  const renderIcon = (iconName, isActive) => {
    const iconContainerClass = isActive
      ? 'w-9 h-9 rounded-full bg-[#202227] flex items-center justify-center flex-shrink-0 text-white transition-colors'
      : 'w-9 h-9 rounded-full bg-white border border-black/[0.05] shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center flex-shrink-0 text-neutral-700 transition-colors group-hover:border-black/[0.1]';

    switch (iconName) {
      case 'LayoutGrid':
        return (
          <div className={iconContainerClass}>
            <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'Layers':
        return (
          <div className={iconContainerClass}>
            <Layers className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'FileText':
        return (
          <div className={iconContainerClass}>
            <FileText className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'CreditCard':
        return (
          <div className={iconContainerClass}>
            <CreditCard className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'Users':
        return (
          <div className={iconContainerClass}>
            <Users className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      default:
        return (
          <div className={iconContainerClass}>
            <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
    }
  };

  const getSectionTitle = () => {
    if (isCustomer) return 'ACCOUNT PORTAL';
    if (isStaff) return 'STAFF OPERATIONS';
    return 'ADMINISTRATION';
  };

  return (
    <div
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative z-40"
    >
      {/* Expandable Navigation Chart (Image 2) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="navigation-chart"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 30,
            }}
            className="fixed top-[68px] left-4 sm:left-6 md:left-8 w-[285px] bg-[#F6F7F9] border border-black/[0.08] rounded-[26px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl z-50 flex flex-col justify-between max-h-[calc(100vh-5.5rem)] overflow-y-auto"
          >
            <div>
              {/* Header with Title & Pin / Close controls */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/[0.05]">
                <div className="flex items-center space-x-2">
                  <div className="bg-neutral-900 text-white font-bold text-xs rounded-lg w-6 h-6 flex items-center justify-center">
                    SX
                  </div>
                  <span className="text-xs font-bold text-neutral-900 tracking-tight">Navigation</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setIsPinned(!isPinned)}
                    className={`p-1.5 rounded-full transition-colors ${
                      isPinned
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-400 hover:text-neutral-900 hover:bg-black/[0.05]'
                    }`}
                    title={isPinned ? 'Unpin navigation' : 'Pin navigation open'}
                  >
                    {isPinned ? (
                      <Pin className="w-3.5 h-3.5" strokeWidth={2} />
                    ) : (
                      <PinOff className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-black/[0.05] transition-colors"
                    title="Close navigation"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Exact Category Label from reference screenshot: ADMINISTRATION */}
              <div className="px-3.5 mb-2.5 pt-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {getSectionTitle()}
              </div>

              {/* GooeyNav Animated Liquid Particle Navigation */}
              <GooeyNav
                items={allowedItems}
                activeId={currentView}
                theme="dark"
                size="md"
                frame={false}
                particleCount={15}
                spread={56}
                animationTime={600}
                timeVariance={300}
                gooeyness={0.5}
                wobble={0.5}
                hoverEffect
                onChange={(index, item) => {
                  onSelectView(item.id);
                  if (!isPinned) setIsOpen(false);
                }}
                renderItem={(item, isActive) => (
                  <div
                    className={`w-full flex items-center justify-between transition-all duration-150 rounded-[22px] text-left cursor-pointer ${
                      isActive
                        ? 'text-white px-3.5 py-3'
                        : 'text-neutral-800 hover:text-neutral-950 px-3.5 py-2.5 hover:bg-black/[0.035]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {renderIcon(item.iconName, isActive)}
                      <span
                        className={`text-sm tracking-tight truncate ${
                          isActive ? 'text-white font-bold' : 'text-neutral-900 font-semibold'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-2 flex-shrink-0 ${
                          item.badgeColor || 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              />

              {/* Access Level / Permissions Card */}
              <div className="mt-4 bg-white rounded-[20px] p-3.5 border border-black/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-xs">
                <div className="flex items-center space-x-2 text-neutral-900 font-semibold mb-1">
                  <div className="w-5 h-5 rounded-full bg-[#F5F6F8] text-neutral-700 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight">Role Permissions</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed font-normal">
                  {isAdmin && 'Full superuser privileges: manage billing, catalog, users & revenue.'}
                  {isStaff && 'Staff permissions: manage subscriptions, review accounts, issue invoices and record payments.'}
                  {isCustomer && 'Customer permissions: view self subscriptions, track billing dates & invoices.'}
                </p>
              </div>
            </div>

            {/* Bottom Profile & Logout Footer */}
            <div className="pt-3.5 mt-4 border-t border-black/[0.05]">
              <div className="flex items-center justify-between p-2 rounded-[20px] bg-white border border-black/[0.04] shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SX'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 truncate">
                      {user?.name || 'Administrator'}
                    </div>
                    <div className="text-[10px] text-neutral-400 capitalize truncate">
                      {user?.role || 'User'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-7 h-7 rounded-full bg-[#F5F6F8] hover:bg-rose-50 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
