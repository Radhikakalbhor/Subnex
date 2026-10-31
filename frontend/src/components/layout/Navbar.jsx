import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/Badge';
import {
  CreditCard,
  LogOut,
  User,
  Shield,
  Layers,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export default function Navbar({ onOpenRecordPayment, currentView, onSelectView }) {
  const { user, logout, quickLoginAs } = useAuth();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const handleRoleSwitch = async (role) => {
    setSwitchLoading(true);
    try {
      await quickLoginAs(role);
    } catch (err) {
      console.warn('Switch role error:', err);
    } finally {
      setSwitchLoading(false);
      setRoleSwitcherOpen(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white font-black text-xl rounded-xl w-10 h-10 flex items-center justify-center shadow-md shadow-indigo-100">
            SX
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                SUBNEX
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-full border border-indigo-200">
                Phase 6 Production
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden md:block">
              One Platform. Every Subscription. Complete Control.
            </p>
          </div>
        </div>

        {/* Action Controls & User Account */}
        <div className="flex items-center space-x-3">
          {/* Record Manual Payment CTA (Admin and Staff only) */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <button
              onClick={onOpenRecordPayment}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Record Payment</span>
              <span className="sm:hidden">Pay</span>
            </button>
          )}

          {/* Quick Role Switcher (for demo/evaluator convenience) */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              disabled={switchLoading}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
              title="Switch demo role perspective"
            >
              {switchLoading ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-indigo-600 animate-spin" />
              ) : (
                <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              )}
              <span className="capitalize">{user?.role || 'Guest'}</span>
              <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
            </button>

            {roleSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Role
                </div>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                >
                  <span>Admin (Full Superuser)</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                </button>
                <button
                  onClick={() => handleRoleSwitch('staff')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                >
                  <span>Staff (Billing & Ops)</span>
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                </button>
                <button
                  onClick={() => handleRoleSwitch('customer')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                >
                  <span>Customer (Subscriber Portal)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                </button>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {user?.full_name || 'System User'}
              </div>
              <div className="text-[10px] text-slate-500">{user?.email}</div>
            </div>
            <RoleBadge role={user?.role} />
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
