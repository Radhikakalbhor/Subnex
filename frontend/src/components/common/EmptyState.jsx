import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items matching your criteria.',
  icon: Icon = Inbox,
  actionText,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[22px] border border-dashed border-neutral-200">
      <div className="w-12 h-12 rounded-full bg-[#F6F7F9] border border-black/[0.04] text-neutral-400 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-neutral-500 max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-full shadow-xs transition-all active:scale-[0.98]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
