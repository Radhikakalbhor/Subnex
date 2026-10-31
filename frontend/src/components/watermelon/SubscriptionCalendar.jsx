import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Download,
  X,
  Loader2,
  Calendar as CalendarIcon,
  Check,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../../utils/formatters';

const spring = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.8,
};

export function SubscriptionCalendar({
  subscriptions = [],
  monthlyTotal = 0,
  onAddSubscription = null,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  // Generate days in month
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentDate.getMonth(), 1).getDay() + 6) % 7; // Mon = 0

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentDate.getMonth() + 1, 1));
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      // Generate CSV statement
      const csv = ['Subscription #,Plan,Amount,Next Billing Date',
        ...subscriptions.map(s => `"${s.subscription_number}","${s.plan_name || 'Standard'}","${s.total_amount || 0}","${s.next_billing_date || ''}"`)
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${currentMonth}-${currentYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }, 1200);
  };

  // Map subscriptions to days of this month
  const daySubscriptionMap = {};
  subscriptions.forEach(sub => {
    if (sub.next_billing_date) {
      const d = new Date(sub.next_billing_date);
      if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!daySubscriptionMap[day]) daySubscriptionMap[day] = [];
        daySubscriptionMap[day].push(sub);
      }
    }
  });

  const selectedSubs = daySubscriptionMap[selectedDay] || [];

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring}
      className="relative w-full rounded-[24px] border border-black/[0.06] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300"
    >
      {/* Top Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F5F6F8] border border-black/[0.04] text-neutral-800 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
              {currentMonth} {currentYear}
            </h3>
            <span className="text-[10px] text-neutral-400 font-medium">
              Billing Cycles & Renewal Anchors
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-full bg-[#F5F6F8] hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-all"
            title="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-full bg-[#F5F6F8] hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-all"
            title="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = selectedDay === day;
          const hasSubs = (daySubscriptionMap[day] || []).length > 0;
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === currentDate.getMonth() &&
            new Date().getFullYear() === currentYear;

          return (
            <motion.button
              key={`day-${day}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(day)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : hasSubs
                  ? 'bg-blue-500/[0.08] text-blue-700 font-semibold border border-blue-500/20'
                  : isToday
                  ? 'bg-[#F5F6F8] text-neutral-900 font-bold border border-black/[0.12]'
                  : 'bg-[#F8F9FA] hover:bg-[#F1F3F5] text-neutral-700'
              }`}
            >
              <span>{day}</span>

              {/* Renewal dot indicators */}
              {hasSubs && (
                <div className="absolute bottom-1 flex gap-0.5">
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-blue-600'
                    }`}
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Day Details Callout */}
      <div className="mt-4 pt-3.5 border-t border-black/[0.05]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-neutral-800">
            {currentMonth} {selectedDay} Renewals
          </span>
          <span className="text-[11px] font-medium text-neutral-400">
            {selectedSubs.length} scheduled
          </span>
        </div>

        {selectedSubs.length === 0 ? (
          <p className="text-[11px] text-neutral-400 italic py-1">
            No subscription renewals anchored on this date.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {selectedSubs.map(sub => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] border border-black/[0.04] text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-900">{sub.subscription_number}</div>
                  <div className="text-[10px] text-neutral-400">{sub.plan_name || 'Active Plan'}</div>
                </div>
                <div className="font-bold text-neutral-900">
                  {formatCurrency(sub.total_amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Bar: Total & Actions */}
      <div className="mt-4 pt-3.5 border-t border-black/[0.05] flex items-center justify-between">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center px-3 py-1.5 text-[11px] font-medium text-neutral-700 bg-[#F5F6F8] hover:bg-neutral-200 rounded-full border border-black/[0.04] transition-all"
        >
          {isDownloading ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-3 h-3 mr-1.5" />
          )}
          <span>{isDownloading ? 'Exporting...' : 'Export Schedule'}</span>
        </button>

        <div className="text-right">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Estimated Monthly Spend
          </span>
          <span className="text-sm font-bold text-neutral-900">
            {formatCurrency(monthlyTotal)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

