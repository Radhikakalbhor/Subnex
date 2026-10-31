import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  FileText,
  CreditCard,
  Users,
  ShieldCheck,
  Building2,
  Clock,
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
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isCustomer ? 'Account Portal' : isStaff ? 'Staff Operations' : 'Administration'}
          </div>
          <nav className="space-y-1">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.badgeColor}`}
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
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Role Permissions</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isAdmin && 'Full platform superuser privileges: manage billing, catalog, users, overrides & refunds.'}
            {isStaff && 'Staff permissions: manage subscriptions, review accounts, issue invoices and record payments.'}
            {isCustomer && 'Customer permissions: view self subscriptions, track billing dates, inspect invoices & submit payments.'}
          </p>
        </div>
      </div>

      {/* System Status info */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            PostgreSQL Live
          </span>
          <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}

