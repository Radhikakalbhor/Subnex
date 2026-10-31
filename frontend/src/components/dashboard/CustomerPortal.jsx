import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../common/StatCard';
import BorderGlow from '../common/BorderGlow';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { SubscriptionCalendar } from '../watermelon/SubscriptionCalendar';
import { CreditUsageCard } from '../watermelon/CreditUsageCard';
import { CopyConfirm } from '../watermelon/CopyConfirm';
import { ShimmerButton } from '../watermelon/ShimmerButton';
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

      setSubscriptions(subsRes.data.data?.subscriptions || subsRes.data.data || []);
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
      <div className="bg-rose-500/[0.08] border border-rose-500/20 text-rose-700 p-6 rounded-[22px]">
        <h3 className="font-semibold text-sm mb-1">Failed to load portal data</h3>
        <p className="text-xs text-rose-600/90">{error}</p>
        <button
          onClick={fetchCustomerData}
          className="mt-3 px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-full hover:bg-rose-700 transition-colors"
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
      <div className="saas-card p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center text-[11px] font-medium px-3 py-1 rounded-full bg-[#F5F6F8] text-neutral-600 border border-black/[0.04] mb-2.5">
              Subscriber Self-Service Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-normal">
              Account: <span className="font-semibold text-neutral-800">{user?.email}</span>
              {user?.company_name && <span> • Organization: {user?.company_name}</span>}
            </p>
          </div>
          {unpaidInvoices.length > 0 && (
            <ShimmerButton
              onClick={() => handleOpenInvoiceStatement(unpaidInvoices[0])}
              size="md"
              className="self-start md:self-auto text-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
              View Outstanding Invoices ({formatCurrency(kpis.total_outstanding || 0)})
            </ShimmerButton>
          )}
        </div>
      </div>

      {/* Overdue Warning Callout (if any) */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-500/[0.08] border border-rose-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-rose-800">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" strokeWidth={1.75} />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">Overdue Invoices Alert: </span>
            You have {overdueInvoices.length} overdue invoice(s) totaling{' '}
            <span className="font-bold">{formatCurrency(kpis.total_overdue_amount || 0)}</span>.
            Please coordinate payment remittance with your account manager to avoid service disruption.
          </div>
        </div>
      )}

      {/* Customer KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="My Active Plans"
          value={kpis.active_subscriptions || 0}
          subtext="Active recurring subscriptions"
          icon={Layers}
          color="indigo"
        />

        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(kpis.total_outstanding || 0)}
          subtext={`${unpaidInvoices.length} unpaid / partial invoice(s)`}
          icon={AlertCircle}
          color={kpis.total_outstanding > 0 ? 'rose' : 'emerald'}
          badgeText={kpis.total_outstanding > 0 ? 'Pending Payment' : 'Settled'}
          badgeType={kpis.total_outstanding > 0 ? 'danger' : 'default'}
        />

        <StatCard
          title="Total Invoiced"
          value={formatCurrency(kpis.total_invoiced || 0)}
          subtext={`${invoices.length} billing statements issued`}
          icon={FileText}
          color="blue"
        />

        <StatCard
          title="Total Payments Reconciled"
          value={formatCurrency(kpis.total_revenue || 0)}
          subtext={`${payments.length} verified payment record(s)`}
          icon={CreditCard}
          color="emerald"
        />
      </div>

      {/* Watermelon UI: Interactive Subscription Calendar & Account Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionCalendar
          subscriptions={subscriptions}
          monthlyTotal={subscriptions.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)}
        />
        <CreditUsageCard
          title="Account Settlement & Invoiced Fulfillment"
          collectedAmount={kpis.total_revenue || 0}
          invoicedTotal={kpis.total_invoiced || 0}
          outstandingAmount={kpis.total_outstanding || 0}
        />
      </div>

      {/* 1. My Subscriptions */}
      <div className="saas-card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center tracking-tight">
              <div className="w-6 h-6 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2 text-neutral-700">
                <Layers className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              My Subscriptions
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Overview of your subscribed products, intervals and billing cycle anchors.
            </p>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-0.5 bg-[#F5F6F8] text-neutral-700 rounded-full border border-black/[0.04]">
            {subscriptions.length} Plan(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
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
            <tbody className="divide-y divide-black/[0.04]">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-neutral-400 italic">
                    No active subscriptions assigned to this account.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-neutral-900">
                      {sub.subscription_number}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-neutral-900">
                        {sub.plan_name || 'Standard Plan'}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {sub.lines?.length || 1} line item(s) configured
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-neutral-600 capitalize">
                      {sub.billing_interval || 'Monthly'}
                    </td>
                    <td className="px-6 py-3.5 text-neutral-500">
                      {formatDate(sub.start_date || sub.current_period_start)}
                    </td>
                    <td className="px-6 py-3.5 text-neutral-500">
                      {sub.next_billing_date ? (
                        <span className="font-semibold text-neutral-900">
                          {formatDate(sub.next_billing_date)}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic">End of Term</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-neutral-900">
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
      <div className="saas-card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center tracking-tight">
              <div className="w-6 h-6 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2 text-neutral-700">
                <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              My Invoices & Billing Statements
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Review line items, payment terms, reconciled amounts and outstanding balances.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
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
            <tbody className="divide-y divide-black/[0.04]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-neutral-400 italic">
                    No invoices generated for this account yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-neutral-900">
                      <div className="flex items-center space-x-1.5">
                        <span>{inv.invoice_number}</span>
                        <CopyConfirm valueToCopy={inv.invoice_number} copyText="" />
                        {inv.is_overdue && (
                          <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-rose-500/[0.1] text-rose-700 font-semibold uppercase rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-neutral-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-6 py-3.5 font-medium text-neutral-700">{formatDate(inv.due_date)}</td>
                    <td className="px-6 py-3.5 font-semibold text-neutral-900">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-emerald-700">
                      {formatCurrency(inv.amount_paid)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-rose-600">
                      {formatCurrency(inv.amount_remaining)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenInvoiceStatement(inv)}
                        className="px-3 py-1 bg-[#F5F6F8] hover:bg-neutral-900 hover:text-white text-neutral-800 font-medium rounded-full text-[11px] transition-all inline-flex items-center border border-black/[0.04]"
                      >
                        <Eye className="w-3 h-3 mr-1" strokeWidth={1.75} />
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
      <div className="saas-card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.05]">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center tracking-tight">
            <div className="w-6 h-6 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2 text-neutral-700">
              <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
            </div>
            My Payment History
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Audit log of all payments verified and reconciled against your account by finance operations.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
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
            <tbody className="divide-y divide-black/[0.04]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-neutral-400 italic">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5 font-mono font-semibold text-neutral-800">
                      <div className="flex items-center space-x-1.5">
                        <span>{p.payment_reference}</span>
                        <CopyConfirm valueToCopy={p.payment_reference} copyText="" />
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-neutral-500">{p.invoice_number || '—'}</td>
                    <td className="px-6 py-3.5 text-neutral-700">
                      {formatPaymentMethod(p.payment_method)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-neutral-400">{formatDate(p.payment_date)}</td>
                    <td className="px-6 py-3.5 text-neutral-400 max-w-xs truncate">
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
        >
          <div className="space-y-5 text-xs">
            {/* Header Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 rounded-[18px] border border-black/[0.04]">
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Status</span>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Issue Date</span>
                <span className="font-semibold text-neutral-800">{formatDate(selectedInvoice.issue_date)}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Due Date</span>
                <span className={`font-semibold ${selectedInvoice.is_overdue ? 'text-rose-600' : 'text-neutral-800'}`}>
                  {formatDate(selectedInvoice.due_date)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Balance Remaining</span>
                <span className="font-bold text-rose-600 text-sm">{formatCurrency(selectedInvoice.amount_remaining)}</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white border border-black/[0.06] rounded-[18px] p-4 space-y-2">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {Number(selectedInvoice.tax_total) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedInvoice.tax_total)}</span>
                </div>
              )}
              {Number(selectedInvoice.discount_total) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(selectedInvoice.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-neutral-900 pt-2 border-t border-black/[0.05]">
                <span>Total Amount Invoiced:</span>
                <span>{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Reconciled by Finance:</span>
                <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold text-sm pt-1 border-t border-dashed border-neutral-200">
                <span>Outstanding Balance Due:</span>
                <span>{formatCurrency(selectedInvoice.amount_remaining)}</span>
              </div>
            </div>

            {/* Remittance & Payment Policy Notice */}
            <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-[18px] p-4 text-amber-900 flex items-start space-x-3">
              <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" strokeWidth={1.75} />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold">Payment Remittance Notice: </span>
                All manual payments (bank transfers, checks, or corporate ACH) are verified and reconciled by SUBNEX Finance Operations. Please remit payments quoting invoice number{' '}
                <span className="font-mono font-bold text-amber-950">{selectedInvoice.invoice_number}</span>.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-semibold rounded-full text-xs shadow-xs transition-all active:scale-[0.98]"
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
