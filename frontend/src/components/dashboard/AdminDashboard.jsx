import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../common/StatCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { StatusBadge } from '../common/Badge';
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
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl">
        <h3 className="font-bold text-sm mb-1">Failed to Load Dashboard</h3>
        <p className="text-xs">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-3 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Executive & Finance Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live transactional ledger, active subscription tracking & revenue reconciliations.
            </p>
          </div>
          <button
            onClick={fetchDashboardStats}
            className="self-start lg:self-auto inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Filters Bar (Requirement 7: Filters by date, status, customer) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Customer
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Subscription Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                To Date
              </label>
              {(fromDate || toDate || statusFilter !== 'all' || customerFilter) && (
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 4 Primary KPIs (Requirements 1, 2, 3, 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Active Subscriptions */}
        <StatCard
          title="1. Active Subscriptions"
          value={kpis.active_subscriptions || 0}
          subtext={`Across ${kpis.total_subscriptions || 0} total subscriptions`}
          icon={Layers}
          color="indigo"
          badgeText="Active"
        />

        {/* KPI 2: Total Revenue Received */}
        <StatCard
          title="2. Total Revenue Received"
          value={formatCurrency(kpis.total_revenue || 0)}
          subtext={`${kpis.total_successful_payments || 0} successful payment transactions`}
          icon={DollarSign}
          color="emerald"
        />

        {/* KPI 3: Outstanding Payment Amount */}
        <StatCard
          title="3. Outstanding Balance"
          value={formatCurrency(kpis.total_outstanding || 0)}
          subtext={`Invoiced: ${formatCurrency(kpis.total_invoiced || 0)}`}
          icon={TrendingUp}
          color="amber"
        />

        {/* KPI 4: Number of Overdue Invoices */}
        <StatCard
          title="4. Overdue Invoices"
          value={kpis.overdue_invoices_count || 0}
          subtext={`Unpaid: ${formatCurrency(kpis.total_overdue_amount || 0)}`}
          icon={AlertTriangle}
          color="rose"
          badgeText={kpis.overdue_invoices_count > 0 ? 'Action Needed' : 'Healthy'}
          badgeType={kpis.overdue_invoices_count > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Subscription & Payment Analytics Breakdown (Requirement 5 & 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5. Subscription Statistics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center">
              <PieChart className="w-4 h-4 mr-2 text-indigo-600" />
              5. Subscription Statistics
            </h3>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              MRR: {formatCurrency(kpis.mrr_estimate || 0)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <span className="font-medium text-emerald-800">Active</span>
              <span className="font-bold text-emerald-700">{subStats.active || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100">
              <span className="font-medium text-amber-800">Paused</span>
              <span className="font-bold text-amber-700">{subStats.paused || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100">
              <span className="font-medium text-rose-800">Past Due</span>
              <span className="font-bold text-rose-700">{subStats.past_due || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Closed / Expired</span>
              <span className="font-bold text-slate-800">
                {(subStats.closed || 0) + (subStats.expired || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 border border-sky-100">
              <span className="font-medium text-sky-800">Quotations / Drafts</span>
              <span className="font-bold text-sky-700">
                {(subStats.quotation || 0) + (subStats.draft || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 6a. Payment Method Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-emerald-600" />
              6a. Payment Methods
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              Total: {formatCurrency(kpis.total_revenue || 0)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Bank Transfer / Wire</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(payBreakdown.bank_transfer || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Credit Card</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(payBreakdown.credit_card || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-600">UPI Instant</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(payBreakdown.upi || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Cheque / Check</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(payBreakdown.check || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Cash Settlement</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(payBreakdown.cash || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-600">Manual Adjustments</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(payBreakdown.manual || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 6b. Invoice Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              6b. Invoices Status
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              Count: {kpis.total_invoices || 0}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="font-medium text-emerald-800">Fully Paid</span>
              <span className="font-bold text-emerald-700">{invBreakdown.paid || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-100">
              <span className="font-medium text-blue-800">Confirmed / Open</span>
              <span className="font-bold text-blue-700">{invBreakdown.open || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-100">
              <span className="font-medium text-rose-800 font-bold">Past Due (Overdue)</span>
              <span className="font-bold text-rose-700">{invBreakdown.overdue || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Draft Invoices</span>
              <span className="font-bold text-slate-800">{invBreakdown.draft || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ledger Tables (Invoices & Payments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Invoices</h3>
            <button
              onClick={() => onSelectView('invoices')}
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Remaining</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats?.recent_invoices || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-400 italic">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  (stats?.recent_invoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {inv.invoice_number}
                        {inv.is_overdue && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-bold uppercase">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{inv.customer_name}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-600">
                        {formatCurrency(inv.amount_remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.amount_remaining > 0 && inv.status !== 'void' && (
                          <button
                            onClick={() => onRecordPaymentForInvoice(inv)}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                          >
                            Pay
                          </button>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Payment Transactions</h3>
            <button
              onClick={() => onSelectView('payments')}
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats?.recent_payments || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-400 italic">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  (stats?.recent_payments || []).map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-800">
                        {pay.payment_reference}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{pay.customer_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPaymentMethod(pay.payment_method)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(pay.payment_date)}</td>
                      <td className="px-4 py-3">
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

