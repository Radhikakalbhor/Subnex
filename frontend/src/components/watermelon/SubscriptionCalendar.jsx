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
import BorderGlow from '../common/BorderGlow';

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

  const handleDownloadIcs = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        ['Subscription,Customer,Next Billing Date,Amount,Status']
          .concat(
            subscriptions.map(
              s =>
                `"${s.subscription_number}","${s.customer_name || ''}","${s.next_billing_date}","${s.grand_total || s.recurring_total || 0}","${s.status}"`
            )
          )
          .join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `subnex-renewals-${currentMonth.toLowerCase()}-${currentYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 800);
  };

  // Map subscriptions to days of the current month
  const daySubscriptionMap = {};
  subscriptions.forEach(sub => {
    if (sub.next_billing_date) {
      const bDate = new Date(sub.next_billing_date);
      if (
        bDate.getMonth() === currentDate.getMonth() &&
        bDate.getFullYear() === currentDate.getFullYear()
      ) {
        const day = bDate.getDate();
        if (!daySubscriptionMap[day]) daySubscriptionMap[day] = [];
        daySubscriptionMap[day].push(sub);
      }
    }
  });

  const selectedSubs = daySubscriptionMap[selectedDay] || [];

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
            <div key={`empty-${i}`} className="h-9 sm:h-10 rounded-xl bg-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const hasSubs = daySubscriptionMap[dayNum] && daySubscriptionMap[dayNum].length > 0;
            const isSelected = selectedDay === dayNum;
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear();

            return (
              <motion.button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex flex-col items-center justify-center h-9 sm:h-10 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : isToday
                    ? 'bg-[#F5F6F8] text-neutral-900 border-black/[0.12] font-bold'
                    : 'bg-white hover:bg-[#F9FAFB] text-neutral-700 border-black/[0.04]'
                }`}
              >
                <span>{dayNum}</span>
                {hasSubs && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-neutral-900'
                    }`}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Day Info Drawer */}
        <div className="mt-4 pt-4 border-t border-black/[0.05]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-900">
              Renewals for {currentMonth} {selectedDay}:
            </span>
            <span className="text-[11px] font-semibold text-neutral-600 bg-[#F5F6F8] px-2.5 py-0.5 rounded-full border border-black/[0.04]">
              {selectedSubs.length} scheduled
            </span>
          </div>

          {selectedSubs.length === 0 ? (
            <p className="text-[11px] text-neutral-400 py-1">
              No subscription cycles scheduled to bill on this day.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {selectedSubs.map(sub => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] border border-black/[0.03] text-xs"
                >
                  <div>
                    <span className="font-semibold text-neutral-900 block">
                      {sub.subscription_number}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {sub.customer_name || 'Customer'}
                    </span>
                  </div>
                  <span className="font-bold text-neutral-900">
                    {formatCurrency(sub.grand_total || sub.recurring_total || 0, sub.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-4 pt-3 flex items-center justify-between text-xs border-t border-black/[0.05]">
          <span className="text-[11px] text-neutral-400">
            Est. Monthly Volume: <strong className="text-neutral-900">{formatCurrency(monthlyTotal)}</strong>
          </span>
          <button
            type="button"
            onClick={handleDownloadIcs}
            disabled={isDownloading}
            className="inline-flex items-center px-3 py-1.5 text-[11px] font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span>{isDownloading ? 'Exporting...' : 'Export Schedule'}</span>
          </button>
        </div>
      </div>
    </BorderGlow>
  );
}

export default SubscriptionCalendar;
