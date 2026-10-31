import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading live data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

