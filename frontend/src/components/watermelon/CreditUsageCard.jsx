import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import BorderGlow from '../common/BorderGlow';

export function CreditUsageCard({
  title = 'Revenue Realization & Invoiced Collection',
  collectedAmount = 0,
  invoicedTotal = 0,
  outstandingAmount = 0,
  onExportCsv = null,
}) {
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [downloadDone, setDownloadDone] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30 Days');

  const total = Number(invoicedTotal) || 1;
  const collected = Number(collectedAmount) || 0;
  const percent = Math.min(100, Math.round((collected / total) * 100));

  const segments = 60;
  const activeSegments = Math.round((percent / 100) * segments);

  const handleDownload = () => {
    setDownloadDone(true);
    setTimeout(() => setDownloadDone(false), 2000);
    if (onExportCsv) {
      onExportCsv();
    } else {
      const csv = `Metric,Value\nTotal Invoiced,${invoicedTotal}\nReconciled Collections,${collectedAmount}\nOutstanding Balance,${outstandingAmount}\nRealization Rate,${percent}%`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-realization-${selectedPeriod.toLowerCase().replace(' ', '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <BorderGlow
      edgeSensitivity={30}
      glowColor="40 80 80"
      backgroundColor="#FFFFFF"
      borderRadius={24}
      glowRadius={40}
      glowIntensity={1}
      coneSpread={25}
      animated={false}
      colors={['#c084fc', '#f472b6', '#38bdf8']}
      className="w-full border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
    >
      <div className="p-5 sm:p-6 transition-all duration-300">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-black/[0.05]">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase block mb-1">
              {title}
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-neutral-900 tracking-tight">
                {percent}%
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-500/[0.1] px-2 py-0.5 rounded-full border border-emerald-500/20">
                Realized
              </span>
            </div>
          </div>

          {/* Auto-reconcile toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#F8F9FA] px-3 py-1.5 rounded-full border border-black/[0.04]">
            <span className="text-xs font-medium text-neutral-600">Auto-Reconcile</span>
            <button
              type="button"
              onClick={() => setAutoReconcile(!autoReconcile)}
              className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoReconcile ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoReconcile ? 'translate-x-3' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* 60-segment LED Meter */}
        <div className="my-5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2 font-medium">
            <span>Collected: {formatCurrency(collected)}</span>
            <span>Target: {formatCurrency(total)}</span>
          </div>

          <div className="grid grid-flow-col auto-cols-fr gap-[3px] h-6 bg-[#F5F6F8] p-1 rounded-xl border border-black/[0.04]">
            {Array.from({ length: segments }).map((_, idx) => {
              const isActive = idx < activeSegments;
              return (
                <div
                  key={idx}
                  className={`h-full rounded-[2px] transition-all duration-300 ${isActive
                      ? 'bg-neutral-900 shadow-[0_0_6px_rgba(0,0,0,0.25)]'
                      : 'bg-neutral-200/60'
                    }`}
                />
              );
            })}
          </div>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-black/[0.05]">
          <div className="bg-[#F8F9FA] rounded-[16px] p-3 border border-black/[0.03]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
              Reconciled Total
            </span>
            <span className="text-base font-bold text-neutral-900">
              {formatCurrency(collected)}
            </span>
          </div>
          <div className="bg-[#F8F9FA] rounded-[16px] p-3 border border-black/[0.03]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
              Invoiced Total
            </span>
            <span className="text-base font-bold text-neutral-900">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="bg-[#F8F9FA] rounded-[16px] p-3 border border-black/[0.03]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
              Outstanding Due
            </span>
            <span className="text-base font-bold text-rose-600">
              {formatCurrency(outstandingAmount)}
            </span>
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            {['7 Days', '30 Days', '90 Days', 'All Time'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${selectedPeriod === p
                    ? 'bg-neutral-900 text-white'
                    : 'bg-[#F5F6F8] text-neutral-600 hover:text-neutral-900'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-1.5 text-[11px] font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
          >
            <Download className={`w-3.5 h-3.5 mr-1.5 ${downloadDone ? 'text-emerald-600' : ''}`} />
            <span>{downloadDone ? 'Exported!' : 'Export CSV'}</span>
          </button>
        </div>
      </div>
    </BorderGlow>
  );
}

export default CreditUsageCard;
