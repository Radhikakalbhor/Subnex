import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  FileText,
  CreditCard,
  Users,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({ currentView, onSelectView, overdueCount = 0 }) {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: isCustomer ? 'Subscriber Portal' : 'Overview & KPIs',
      icon: LayoutDashboard,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'subscriptions',
      label: isCustomer ? 'My Subscriptions' : 'Subscriptions',
      icon: Layers,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'invoices',
      label: isCustomer ? 'My Invoices' : 'Invoices',
      icon: FileText,
      badge: overdueCount > 0 ? `${overdueCount} due` : null,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'payments',
      label: isCustomer ? 'Payment History' : 'Payments & Audit',
      icon: CreditCard,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'customers',
      label: 'Customer Registry',
      icon: Users,
      roles: ['admin', 'staff'],
    },
  ];

  const allowedItems = navItems.filter((item) =>
    item.roles.includes(user?.role || 'customer')
  );

  return (
    <aside className="w-full md:w-64 bg-[#F6F7F9] border-r border-black/[0.06] flex-shrink-0 flex flex-col justify-between p-4 md:py-6 md:px-4">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 mb-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {isCustomer ? 'Account Portal' : isStaff ? 'Staff Operations' : 'Administration'}
          </div>
          <nav className="space-y-1.5">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[16px] text-xs font-medium transition-all duration-150 ${isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-black/[0.04]'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isActive
                          ? 'bg-neutral-800 text-white'
                          : 'bg-white border border-black/[0.05] text-neutral-500'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </div>
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Role Permissions Box */}
        <div className="bg-white rounded-[18px] p-4 border border-black/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-xs">
          <div className="flex items-center space-x-2 text-neutral-900 font-semibold mb-1.5">
            <div className="w-5 h-5 rounded-full bg-[#F5F6F8] text-neutral-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
            </div>
            <span className="text-xs tracking-tight">Role Permissions</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-normal">
            {isAdmin && 'Full platform superuser privileges: manage billing, catalog, users, overrides & refunds.'}
            {isStaff && 'Staff permissions: manage subscriptions, review accounts, issue invoices and record payments.'}
            {isCustomer && 'Customer permissions: view self subscriptions, track billing dates, inspect invoices & submit payments.'}
          </p>
        </div>
      </div>

      {/* System Status info */}
      <div className="pt-4 mt-6 border-t border-black/[0.05]">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium px-2">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            Live Enterprise Engine
          </span>
          <span className="font-mono text-[10px] text-neutral-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
