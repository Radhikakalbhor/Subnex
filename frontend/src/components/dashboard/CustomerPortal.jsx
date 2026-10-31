import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../common/StatCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { formatCurrency, formatDate, formatPaymentMethod } from '../../utils/formatters';
import {
  Layers,
  CreditCard,
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Eye,
  Info,
} from 'lucide-react';

export default function CustomerPortal({ onOpenRecordPayment, onRecordPaymentForInvoice }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);

  // Selected invoice for statement view modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, invsRes, paysRes, statsRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/invoices'),
        api.get('/payments'),
        api.get('/dashboard/stats'),
      ]);

      setSubscriptions(subsRes.data.data || []);
      setInvoices(invsRes.data.data?.invoices || []);
      setPayments(paysRes.data.data?.payments || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleOpenInvoiceStatement = async (inv) => {
    setModalLoading(true);
    setSelectedInvoice(inv);
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      setSelectedInvoice(res.data.data);
    } catch (err) {
      console.warn('Failed to fetch full invoice statement:', err.message);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching your personalized subscription & billing records..." />;
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl">
        <h3 className="font-bold text-sm mb-1">Failed to load portal data</h3>
        <p className="text-xs">{error}</p>
        <button
          onClick={fetchCustomerData}
          className="mt-3 px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void' && i.amount_remaining > 0);
  const overdueInvoices = invoices.filter((i) => i.is_overdue);

  return (
    <div className="space-y-6">
      {/* Customer Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
              Subscriber Self-Service Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Account: <span className="font-semibold text-white">{user?.email}</span>
              {user?.company_name && <span> • Organization: {user?.company_name}</span>}
            </p>
          </div>
          {unpaidInvoices.length > 0 && (
            <button
              onClick={() => handleOpenInvoiceStatement(unpaidInvoices[0])}
              className="self-start md:self-auto inline-flex items-center px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-lg transition-all"
            >
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              View Outstanding Invoices ({formatCurrency(kpis.total_outstanding || 0)})
            </button>
          )}
        </div>
      </div>

      {/* Overdue Warning Callout (if any) */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-rose-800">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Overdue Invoices Alert: </span>
            You have {overdueInvoices.length} overdue invoice(s) totaling{' '}
            <span className="font-bold">{formatCurrency(kpis.total_overdue_amount || 0)}</span>.
            Please coordinate payment remittance with your account manager to avoid service disruption.
          </div>
        </div>
      )}

      {/* Customer KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Subscriptions */}
        <StatCard
          title="My Active Plans"
          value={kpis.active_subscriptions || 0}
          subtext="Active recurring subscriptions"
          icon={Layers}
          color="indigo"
        />

        {/* 2. Outstanding Balance */}
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(kpis.total_outstanding || 0)}
          subtext={`${unpaidInvoices.length} unpaid / partial invoice(s)`}
          icon={AlertCircle}
          color={kpis.total_outstanding > 0 ? 'rose' : 'emerald'}
          badgeText={kpis.total_outstanding > 0 ? 'Pending Payment' : 'Settled'}
          badgeType={kpis.total_outstanding > 0 ? 'danger' : 'default'}
        />

        {/* 3. Invoices Total */}
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(kpis.total_invoiced || 0)}
          subtext={`${invoices.length} billing statements issued`}
          icon={FileText}
          color="blue"
        />

        {/* 4. Total Paid */}
        <StatCard
          title="Total Payments Reconciled"
          value={formatCurrency(kpis.total_revenue || 0)}
          subtext={`${payments.length} verified payment record(s)`}
          icon={CreditCard}
          color="emerald"
        />
      </div>

      {/* 1. My Subscriptions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-indigo-600" />
              1. My Subscriptions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of your subscribed products, intervals and billing cycle anchors.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            {subscriptions.length} Plan(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Subscription #</th>
                <th className="px-6 py-3">Plan / Product</th>
                <th className="px-6 py-3">Billing Cycle</th>
                <th className="px-6 py-3">Start Date</th>
                <th className="px-6 py-3">Next Billing Date</th>
                <th className="px-6 py-3">Recurring Total</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                    No active subscriptions assigned to this account.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-bold text-indigo-600">
                      {sub.subscription_number}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">
                        {sub.plan_name || 'Standard Plan'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sub.lines?.length || 1} line item(s) configured
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700 capitalize">
                      {sub.billing_interval || 'Monthly'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {formatDate(sub.start_date || sub.current_period_start)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {sub.next_billing_date ? (
                        <span className="font-semibold text-slate-900">
                          {formatDate(sub.next_billing_date)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">End of Term</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {formatCurrency(sub.total_amount)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2 & 3. Invoices Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              2 & 3. My Invoices & Billing Statements
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review line items, payment terms, reconciled amounts and outstanding balances.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Issue Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Total Amount</th>
                <th className="px-6 py-3">Amount Paid</th>
                <th className="px-6 py-3">Outstanding</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400 italic">
                    No invoices generated for this account yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {inv.invoice_number}
                      {inv.is_overdue && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold uppercase rounded">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{formatDate(inv.issue_date)}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">{formatDate(inv.due_date)}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-emerald-600">
                      {formatCurrency(inv.amount_paid)}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-rose-600">
                      {formatCurrency(inv.amount_remaining)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenInvoiceStatement(inv)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg shadow-xs text-xs transition-colors inline-flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        View Statement
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-emerald-600" />
            4. My Payment History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of all payments verified and reconciled against your account by finance operations.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Payment Reference</th>
                <th className="px-6 py-3">Invoice Number</th>
                <th className="px-6 py-3">Payment Method</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Payment Date</th>
                <th className="px-6 py-3">Reconciliation Note</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-800">
                      {p.payment_reference}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{p.invoice_number || '—'}</td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {formatPaymentMethod(p.payment_method)}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{formatDate(p.payment_date)}</td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Statement Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Statement: ${selectedInvoice.invoice_number}`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Header Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issue Date</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedInvoice.issue_date)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due Date</span>
                <span className={`font-semibold ${selectedInvoice.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDate(selectedInvoice.due_date)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Balance Remaining</span>
                <span className="font-bold text-rose-600 text-sm">{formatCurrency(selectedInvoice.amount_remaining)}</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {Number(selectedInvoice.tax_total) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedInvoice.tax_total)}</span>
                </div>
              )}
              {Number(selectedInvoice.discount_total) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(selectedInvoice.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount Invoiced:</span>
                <span>{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Total Reconciled by Finance:</span>
                <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold text-sm pt-1 border-t border-dashed border-slate-200">
                <span>Outstanding Balance Due:</span>
                <span>{formatCurrency(selectedInvoice.amount_remaining)}</span>
              </div>
            </div>

            {/* Remittance & Payment Policy Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 flex items-start space-x-3">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Payment Remittance Notice: </span>
                All manual payments (bank transfers, checks, or corporate ACH) are verified and reconciled by SUBNEX Finance Operations. Please remit payments quoting invoice number{' '}
                <span className="font-mono font-bold text-amber-950">{selectedInvoice.invoice_number}</span>. Once verified, your account ledger will automatically reflect the payment.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Close Statement
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
