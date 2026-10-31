import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading live data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-neutral-500">
      <div className="w-10 h-10 rounded-full bg-[#F5F6F8] border border-black/[0.04] flex items-center justify-center mb-3">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-800" strokeWidth={2} />
      </div>
      <p className="text-xs font-medium text-neutral-500">{message}</p>
    </div>
  );
}
