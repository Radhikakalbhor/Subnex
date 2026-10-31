import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MenuButton } from './MenuButton';
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

  // Handle clicking outside to shrink back into Menu button when not pinned
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        !isPinned &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isOpen, isPinned, setIsOpen]);

  // Hover expand trigger with debounce
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 350);
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
      className="relative z-30 flex-shrink-0"
    >
      {/* Collapsed State: Shrunk into the exact sleek [ = Menu ] pill button */}
      <div className="p-3 sm:p-4">
        <MenuButton
          isOpen={isOpen}
          onClick={toggleOpen}
          onMouseEnter={handleMouseEnter}
          className="shadow-[0_4px_18px_rgba(0,0,0,0.15)]"
        />
      </div>

      {/* Expandable Navigation Chart (Image 2) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="navigation-chart"
            initial={{ opacity: 0, scale: 0.96, x: -10, y: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -8, y: -4 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 32,
            }}
            className="absolute top-3 left-3 w-[275px] bg-[#F6F7F9] border border-black/[0.08] rounded-[26px] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl z-50 flex flex-col justify-between max-h-[calc(100vh-6rem)] overflow-y-auto"
          >
            <div>
              {/* Header with Menu Button & Pin / Close controls */}
              <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-black/[0.05]">
                <MenuButton
                  isOpen={true}
                  onClick={toggleOpen}
                  className="py-1.5 px-3 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-1.5 rounded-full transition-colors ${
                    isPinned
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-400 hover:text-neutral-900 hover:bg-black/[0.05]'
                  }`}
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                >
                  {isPinned ? (
                    <Pin className="w-3.5 h-3.5" strokeWidth={2} />
                  ) : (
                    <PinOff className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>

              {/* Exact Category Label from reference screenshot: ADMINISTRATION */}
              <div className="px-3.5 mb-2.5 pt-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {getSectionTitle()}
              </div>

              {/* Exact Navigation Chart Items from reference screenshot */}
              <nav className="space-y-2">
                {allowedItems.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: isActive ? 0 : 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectView(item.id);
                        if (!isPinned) setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between transition-all duration-150 rounded-[22px] text-left group cursor-pointer ${
                        isActive
                          ? 'bg-[#121316] text-white shadow-[0_4px_16px_rgba(0,0,0,0.14)] px-3.5 py-3'
                          : 'text-neutral-800 hover:text-neutral-950 hover:bg-black/[0.035] px-3.5 py-2.5'
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
                    </motion.button>
                  );
                })}
              </nav>

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

              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium px-2 pt-2.5">
                <span className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Live Engine
                </span>
                <span className="font-mono text-[9px] text-neutral-400">v1.0.0</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
