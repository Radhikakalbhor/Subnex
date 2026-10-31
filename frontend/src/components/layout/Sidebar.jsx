import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, SidebarBody, SidebarLink } from '../ui/sidebar';
import {
  LayoutGrid,
  Layers,
  FileText,
  CreditCard,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppSidebar({ currentView, onSelectView, overdueCount = 0 }) {
  const { user, isAdmin, isStaff, isCustomer, logout } = useAuth();
  const [open, setOpen] = useState(true);

  const navItems = [
    {
      id: 'dashboard',
      label: isCustomer ? 'Overview & KPIs' : 'Overview & KPIs',
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

  const getIcon = (iconName, isActive) => {
    // Exact circular icon pod styling matching the design
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
    <Sidebar open={open} setOpen={setOpen} animate={true}>
      <SidebarBody className="justify-between gap-6">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {/* Section Heading matching reference screenshot */}
          <div className="px-3 mb-3 pt-2">
            {open ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider"
              >
                {getSectionTitle()}
              </motion.div>
            ) : (
              <div className="w-6 h-1 rounded-full bg-neutral-200 mx-auto" />
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-2.5">
            {allowedItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <SidebarLink
                  key={item.id}
                  link={{
                    label: item.label,
                    icon: getIcon(item.iconName, isActive),
                    badge: item.badge,
                    badgeColor: item.badgeColor,
                  }}
                  active={isActive}
                  onClick={() => onSelectView(item.id)}
                />
              );
            })}
          </div>

          {/* Role Permissions Box (visible when expanded) */}
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 bg-white rounded-[20px] p-3.5 border border-black/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-xs"
            >
              <div className="flex items-center space-x-2 text-neutral-900 font-semibold mb-1">
                <div className="w-5 h-5 rounded-full bg-[#F5F6F8] text-neutral-700 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <span className="text-[11px] font-bold tracking-tight">Access Level</span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed font-normal">
                {isAdmin && 'Full platform superuser privileges: manage billing, catalog, users & revenue.'}
                {isStaff && 'Staff permissions: manage subscriptions, review accounts, issue invoices and record payments.'}
                {isCustomer && 'Customer permissions: view self subscriptions, track billing dates, inspect invoices & submit payments.'}
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer Area: User Profile & Collapse Toggle */}
        <div className="pt-3 border-t border-black/[0.05] flex flex-col gap-2">
          {/* User profile card matching Aceternity demo */}
          <div className="flex items-center justify-between p-2 rounded-[20px] bg-white border border-black/[0.04] shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SX'}
              </div>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-w-0"
                >
                  <div className="text-xs font-bold text-neutral-900 truncate">
                    {user?.name || 'Administrator'}
                  </div>
                  <div className="text-[10px] text-neutral-400 capitalize truncate">
                    {user?.role || 'User'}
                  </div>
                </motion.div>
              )}
            </div>

            {open && (
              <button
                onClick={logout}
                className="w-7 h-7 rounded-full bg-[#F5F6F8] hover:bg-rose-50 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition-colors flex-shrink-0"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle Button */}
          <div className="hidden md:flex items-center justify-between px-1">
            {open ? (
              <div className="flex items-center text-[10px] text-neutral-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                Live Engine
              </div>
            ) : null}
            <button
              onClick={() => setOpen(!open)}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-black/[0.05] transition-colors ml-auto"
              title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {open ? (
                <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
