import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../common/StatCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { StatusBadge } from '../common/Badge';
import { CreditUsageCard } from '../watermelon/CreditUsageCard';
import { CopyConfirm } from '../watermelon/CopyConfirm';
import { ShimmerButton } from '../watermelon/ShimmerButton';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '../../utils/formatters';
import {
  Layers,
  DollarSign,
  AlertTriangle,
  FileText,
  Filter,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Calendar,
  User,
  ArrowRight,
  PieChart,
} from 'lucide-react';

export default function AdminDashboard({ onSelectView, onRecordPaymentForInvoice }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (customerFilter) params.customer_id = customerFilter;

      const res = await api.get('/dashboard/stats', { params });
      setStats(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [fromDate, toDate, statusFilter, customerFilter]);

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setCustomerFilter('');
  };

  if (loading && !stats) {
    return <LoadingSpinner message="Calculating real-time platform metrics from PostgreSQL..." />;
  }

  if (error && !stats) {
    return (
      <div className="bg-rose-500/[0.08] border border-rose-500/20 text-rose-700 p-6 rounded-[22px]">
        <h3 className="font-semibold text-sm mb-1">Failed to Load Dashboard</h3>
        <p className="text-xs text-rose-600/90">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-3 px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-full hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const subStats = stats?.subscription_statistics || {};
  const payBreakdown = stats?.payment_method_breakdown || {};
  const invBreakdown = stats?.invoice_status_breakdown || {};
  const filterOptions = stats?.filter_options || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="saas-card p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-black/[0.05]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Executive & Finance Dashboard
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-normal">
              Live transactional ledger, active subscription tracking & revenue reconciliations.
            </p>
          </div>
          <button
            onClick={fetchDashboardStats}
            className="self-start lg:self-auto inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            Refresh Data
          </button>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Customer
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="saas-input"
            >
              <option value="">All Customers</option>
              {(filterOptions.customers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.company_name ? `(${c.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Subscription Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="saas-input"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="past_due">Past Due</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="saas-input"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                To Date
              </label>
              {(fromDate || toDate || statusFilter !== 'all' || customerFilter) && (
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-neutral-900 hover:text-black font-semibold underline"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="saas-input"
            />
          </div>
        </div>
      </div>

      {/* 4 Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Active Subscriptions"
          value={kpis.active_subscriptions || 0}
          subtext={`Across ${kpis.total_subscriptions || 0} total subscriptions`}
          icon={Layers}
          color="indigo"
          badgeText="Active"
        />

        <StatCard
          title="Total Revenue Received"
          value={formatCurrency(kpis.total_revenue || 0)}
          subtext={`${kpis.total_successful_payments || 0} successful transactions`}
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(kpis.total_outstanding || 0)}
          subtext={`Invoiced: ${formatCurrency(kpis.total_invoiced || 0)}`}
          icon={TrendingUp}
          color="amber"
        />

        <StatCard
          title="Overdue Invoices"
          value={kpis.overdue_invoices_count || 0}
          subtext={`Unpaid: ${formatCurrency(kpis.total_overdue_amount || 0)}`}
          icon={AlertTriangle}
          color="rose"
          badgeText={kpis.overdue_invoices_count > 0 ? 'Action Needed' : 'Healthy'}
          badgeType={kpis.overdue_invoices_count > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Revenue Realization Meter (Watermelon UI Component) */}
      <CreditUsageCard
        title="Real-Time Revenue Realization & Invoiced Collection"
        collectedAmount={kpis.total_revenue || 0}
        invoicedTotal={kpis.total_invoiced || 0}
        outstandingAmount={kpis.total_outstanding || 0}
      />

      {/* Subscription & Payment Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Subscription Statistics */}
        <div className="saas-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-neutral-900 flex items-center tracking-tight">
                <div className="w-6 h-6 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2 text-neutral-700">
                  <PieChart className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                Subscription Statistics
              </h3>
              <span className="text-[11px] font-medium text-neutral-700 bg-[#F5F6F8] px-2.5 py-0.5 rounded-full border border-black/[0.04]">
                MRR: {formatCurrency(kpis.mrr_estimate || 0)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Active</span>
                <span className="font-semibold text-neutral-900">{subStats.active || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Paused</span>
                <span className="font-semibold text-neutral-900">{subStats.paused || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Past Due</span>
                <span className="font-semibold text-neutral-900">{subStats.past_due || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Closed / Expired</span>
                <span className="font-semibold text-neutral-900">
                  {(subStats.closed || 0) + (subStats.expired || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Quotations / Drafts</span>
                <span className="font-semibold text-neutral-900">
                  {(subStats.quotation || 0) + (subStats.draft || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="saas-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-neutral-900 flex items-center tracking-tight">
                <div className="w-6 h-6 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2 text-neutral-700">
                  <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                Payment Methods
              </h3>
              <span className="text-[11px] font-medium text-neutral-500">
                Total: {formatCurrency(kpis.total_revenue || 0)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="text-neutral-600">Bank Transfer / Wire</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(payBreakdown.bank_transfer || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="text-neutral-600">Credit Card</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(payBreakdown.credit_card || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="text-neutral-600">UPI Instant</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(payBreakdown.upi || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="text-neutral-600">Cheque / Check</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(payBreakdown.check || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="text-neutral-600">Cash Settlement</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(payBreakdown.cash || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="saas-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-neutral-900 flex items-center tracking-tight">
                <div className="w-6 h-6 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2 text-neutral-700">
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                Invoices Status
              </h3>
              <span className="text-[11px] font-medium text-neutral-500">
                Count: {kpis.total_invoices || 0}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Fully Paid</span>
                <span className="font-semibold text-neutral-900">{invBreakdown.paid || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Confirmed / Open</span>
                <span className="font-semibold text-neutral-900">{invBreakdown.open || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/15">
                <span className="font-medium text-rose-700">Past Due (Overdue)</span>
                <span className="font-semibold text-rose-800">{invBreakdown.overdue || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] border border-black/[0.03]">
                <span className="font-medium text-neutral-700">Draft Invoices</span>
                <span className="font-semibold text-neutral-900">{invBreakdown.draft || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ledger Tables (Invoices & Payments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="saas-card overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.05] flex items-center justify-between bg-white">
            <h3 className="font-semibold text-sm text-neutral-900 tracking-tight">Recent Invoices</h3>
            <button
              onClick={() => onSelectView('invoices')}
              className="inline-flex items-center text-xs font-semibold text-neutral-900 hover:text-black transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.75} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Remaining</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {(stats?.recent_invoices || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-neutral-400 italic">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  (stats?.recent_invoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-neutral-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{inv.invoice_number}</span>
                          <CopyConfirm valueToCopy={inv.invoice_number} copyText="" />
                          {inv.is_overdue && (
                            <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-rose-500/[0.1] text-rose-700 rounded-full font-semibold uppercase">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600">{inv.customer_name}</td>
                      <td className="px-5 py-3.5 font-medium text-neutral-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-rose-600">
                        {formatCurrency(inv.amount_remaining)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {inv.amount_remaining > 0 && inv.status !== 'void' && (
                          <ShimmerButton
                            onClick={() => onRecordPaymentForInvoice(inv)}
                            size="sm"
                            className="px-3 py-1 text-[11px]"
                          >
                            Pay
                          </ShimmerButton>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="saas-card overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.05] flex items-center justify-between bg-white">
            <h3 className="font-semibold text-sm text-neutral-900 tracking-tight">Recent Payment Transactions</h3>
            <button
              onClick={() => onSelectView('payments')}
              className="inline-flex items-center text-xs font-semibold text-neutral-900 hover:text-black transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.75} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {(stats?.recent_payments || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-neutral-400 italic">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  (stats?.recent_payments || []).map((pay) => (
                    <tr key={pay.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-neutral-800">
                        <div className="flex items-center space-x-1.5">
                          <span>{pay.payment_reference}</span>
                          <CopyConfirm valueToCopy={pay.payment_reference} copyText="" />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600">{pay.customer_name}</td>
                      <td className="px-5 py-3.5 text-neutral-600">
                        {formatPaymentMethod(pay.payment_method)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-700">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400">{formatDate(pay.payment_date)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={pay.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
