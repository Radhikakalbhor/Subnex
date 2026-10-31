import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

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
    <div className="w-full rounded-[24px] border border-black/[0.06] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300">
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
          <span className="text-[11px] font-medium text-neutral-500">
            Auto-reconcile invoices
          </span>
          <button
            type="button"
            title="Toggle auto-reconciliation"
            onClick={() => setAutoReconcile(!autoReconcile)}
            className={`relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
              autoReconcile ? 'bg-neutral-900' : 'bg-neutral-300'
            }`}
          >
            <motion.div
              animate={{ x: autoReconcile ? 16 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="h-4 w-4 bg-white rounded-full shadow-xs"
            />
          </button>
        </div>
      </div>

      {/* Segmented Ticks Visualizer */}
      <div className="py-5">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 mb-2">
          <span>Settled: {formatCurrency(collected)}</span>
          <span className="text-neutral-400">Target: {formatCurrency(total)}</span>
        </div>

        <div className="flex items-center gap-[2.5px] overflow-hidden py-1">
          {Array.from({ length: segments }).map((_, i) => {
            const isActive = i < activeSegments;
            return (
              <div
                key={i}
                className={`h-5 flex-1 rounded-[2px] transition-all duration-300 ${
                  isActive
                    ? 'bg-neutral-900'
                    : 'bg-[#EAEBED]'
                }`}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-2 font-medium">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Breakdown metrics */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-black/[0.05]">
        <div className="p-3.5 rounded-[16px] bg-[#F8F9FA] border border-black/[0.03]">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Collections Realized
          </span>
          <span className="text-base font-bold text-emerald-700">
            {formatCurrency(collected)}
          </span>
        </div>

        <div className="p-3.5 rounded-[16px] bg-[#F8F9FA] border border-black/[0.03]">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Outstanding Due
          </span>
          <span className="text-base font-bold text-rose-600">
            {formatCurrency(outstandingAmount)}
          </span>
        </div>
      </div>

      {/* Footer with CSV Export */}
      <div className="mt-4 pt-3.5 border-t border-black/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {['7 Days', '30 Days', '90 Days'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPeriod(p)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${
                selectedPeriod === p
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
  );
}

