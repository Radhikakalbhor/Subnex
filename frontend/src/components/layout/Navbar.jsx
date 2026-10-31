import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/Badge';
import { ShimmerButton } from '../watermelon/ShimmerButton';
import {
  CreditCard,
  LogOut,
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
    <header className="bg-white/85 backdrop-blur-md border-b border-black/[0.05] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-neutral-900 text-white font-bold text-sm rounded-[12px] w-9 h-9 flex items-center justify-center shadow-xs tracking-tight">
            SX
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-neutral-900">
                SUBNEX
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 bg-[#F5F6F8] text-neutral-600 font-medium rounded-full border border-black/[0.04]">
                Enterprise Suite
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-medium hidden md:block">
              One Platform. Every Subscription. Complete Control.
            </p>
          </div>
        </div>

        {/* Action Controls & User Account */}
        <div className="flex items-center space-x-3">
          {/* Record Manual Payment CTA (Admin and Staff only) */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <ShimmerButton
              onClick={onOpenRecordPayment}
              size="sm"
              className="text-xs font-semibold"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Record Payment</span>
              <span className="sm:hidden">Pay</span>
            </ShimmerButton>
          )}

          {/* Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              disabled={switchLoading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#ECEEF1] rounded-full transition-all border border-black/[0.05] disabled:opacity-50"
              title="Switch demo role perspective"
            >
              {switchLoading ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-neutral-900 animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              )}
              <span className="capitalize">{user?.role || 'Guest'}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1 text-neutral-400" strokeWidth={2} />
            </button>

            {roleSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-black/[0.06] rounded-[20px] shadow-[0_12px_36px_rgba(0,0,0,0.08)] p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Switch Active Role
                </div>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5F6F8] flex items-center justify-between font-medium text-neutral-800 transition-colors"
                >
                  <span>Admin (Full Superuser)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                </button>
                <button
                  onClick={() => handleRoleSwitch('staff')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5F6F8] flex items-center justify-between font-medium text-neutral-800 transition-colors"
                >
                  <span>Staff (Billing & Ops)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                </button>
                <button
                  onClick={() => handleRoleSwitch('customer')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5F6F8] flex items-center justify-between font-medium text-neutral-800 transition-colors"
                >
                  <span>Customer (Subscriber Portal)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </button>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-black/[0.06]">
            <div className="text-right">
              <div className="text-xs font-semibold text-neutral-900 leading-tight">
                {user?.full_name || 'System User'}
              </div>
              <div className="text-[10px] text-neutral-400">{user?.email}</div>
            </div>
            <RoleBadge role={user?.role} />
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="w-8 h-8 rounded-full bg-[#F5F6F8] hover:bg-rose-50 text-neutral-500 hover:text-rose-600 flex items-center justify-center transition-all border border-black/[0.04]"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
