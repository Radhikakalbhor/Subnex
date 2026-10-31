import React from 'react';

export function StatusBadge({ status, type = 'subscription' }) {
  const norm = (status || '').toLowerCase();

  const colorConfigs = {
    // Subscription statuses
    active: 'bg-emerald-500/[0.08] text-emerald-700 border-emerald-500/20',
    confirmed: 'bg-blue-500/[0.08] text-blue-700 border-blue-500/20',
    quotation: 'bg-sky-500/[0.08] text-sky-700 border-sky-500/20',
    draft: 'bg-neutral-500/[0.08] text-neutral-600 border-neutral-500/15',
    paused: 'bg-amber-500/[0.08] text-amber-700 border-amber-500/20',
    past_due: 'bg-rose-500/[0.08] text-rose-700 border-rose-500/20',
    closed: 'bg-neutral-500/[0.08] text-neutral-600 border-neutral-500/15',
    cancelled: 'bg-red-500/[0.08] text-red-700 border-red-500/20',
    expired: 'bg-neutral-500/[0.08] text-neutral-600 border-neutral-500/15',

    // Invoice statuses
    paid: 'bg-emerald-500/[0.08] text-emerald-700 border-emerald-500/20',
    open: 'bg-blue-500/[0.08] text-blue-700 border-blue-500/20',
    void: 'bg-neutral-500/[0.08] text-neutral-500 border-neutral-500/15',
    overdue: 'bg-rose-500/[0.1] text-rose-700 border-rose-500/25 font-semibold',

    // Payment statuses
    successful: 'bg-emerald-500/[0.08] text-emerald-700 border-emerald-500/20',
    pending: 'bg-amber-500/[0.08] text-amber-700 border-amber-500/20',
    refunded: 'bg-purple-500/[0.08] text-purple-700 border-purple-500/20',
    failed: 'bg-rose-500/[0.1] text-rose-700 border-rose-500/20',

    // User Roles
    admin: 'bg-neutral-900 text-white border-transparent',
    staff: 'bg-neutral-800 text-white border-transparent',
    customer: 'bg-neutral-100 text-neutral-700 border-neutral-200/60',
  };

  const style = colorConfigs[norm] || 'bg-neutral-500/[0.08] text-neutral-600 border-neutral-500/15';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize tracking-tight ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status ? status.replace('_', ' ') : 'Unknown'}
    </span>
  );
}

export function RoleBadge({ role }) {
  const norm = (role || 'customer').toLowerCase();
  const configs = {
    admin: 'bg-neutral-950 text-white shadow-xs',
    staff: 'bg-neutral-800 text-neutral-100 shadow-xs',
    customer: 'bg-neutral-100 text-neutral-800 border border-neutral-200/80',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize tracking-tight ${
        configs[norm] || 'bg-neutral-100 text-neutral-700'
      }`}
    >
      {role}
    </span>
  );
}
