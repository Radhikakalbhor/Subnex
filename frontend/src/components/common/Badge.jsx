import React from 'react';

export function StatusBadge({ status, type = 'subscription' }) {
  const norm = (status || '').toLowerCase();

  const colorConfigs = {
    // Subscription statuses
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    quotation: 'bg-sky-50 text-sky-700 border-sky-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    past_due: 'bg-rose-50 text-rose-700 border-rose-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-300',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    
    // Invoice statuses
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    void: 'bg-gray-100 text-gray-600 border-gray-200',
    overdue: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',

    // Payment statuses
    successful: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    refunded: 'bg-purple-50 text-purple-700 border-purple-200',
    failed: 'bg-red-50 text-red-700 border-red-200',

    // User Roles
    admin: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    staff: 'bg-purple-100 text-purple-800 border-purple-300',
    customer: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  const style = colorConfigs[norm] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
      {status || 'Unknown'}
    </span>
  );
}

export function RoleBadge({ role }) {
  const norm = (role || 'customer').toLowerCase();
  const colors = {
    admin: 'bg-indigo-600 text-white',
    staff: 'bg-purple-600 text-white',
    customer: 'bg-emerald-600 text-white',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm ${colors[norm] || 'bg-slate-600 text-white'}`}
    >
      {role}
    </span>
  );
}

