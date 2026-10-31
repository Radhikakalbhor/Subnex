import BorderGlow from '../common/BorderGlow';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';
import { ShimmerButton } from '../watermelon/ShimmerButton';
import { CopyConfirm } from '../watermelon/CopyConfirm';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '../../utils/formatters';
import {
  CreditCard,
  Search,
  RefreshCw,
  PlusCircle,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

export default function PaymentList({ onOpenRecordPayment }) {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Refund status message
  const [refundMsg, setRefundMsg] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };
      if (methodFilter) params.payment_method = methodFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/payments', { params });
      setPayments(res.data.data?.payments || []);
      setTotalCount(res.data.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [methodFilter, statusFilter, currentPage]);

  const handleRefund = async (paymentId, ref) => {
    if (!window.confirm(`Are you sure you want to refund payment '${ref}'? This will restore the invoice balance.`)) {
      return;
    }
    setRefundMsg(null);
    try {
      await api.post(`/payments/${paymentId}/refund`);
      setRefundMsg(`Payment '${ref}' was successfully refunded and invoice balance restored.`);
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Refund failed');
    }
  };

  // Client-side search filtering
  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.payment_reference?.toLowerCase().includes(term) ||
      p.invoice_number?.toLowerCase().includes(term) ||
      p.customer_name?.toLowerCase().includes(term) ||
      p.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="saas-card p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-black/[0.05]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight flex items-center">
              <div className="w-7 h-7 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2.5 text-neutral-800">
                <CreditCard className="w-4 h-4" strokeWidth={1.75} />
              </div>
              {isCustomer ? 'My Payment History' : 'Payment Transactions & Reconciliation'}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-normal">
              Verified manual payment audit ledger, method allocations and refunds.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isCustomer && (
              <ShimmerButton
                onClick={onOpenRecordPayment}
                size="sm"
                className="text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                Record Payment
              </ShimmerButton>
            )}
            <button
              onClick={fetchPayments}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Refresh
            </button>
          </div>
        </div>

        {refundMsg && (
          <div className="mt-4 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-800 text-xs rounded-xl font-medium flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" strokeWidth={2} />
            {refundMsg}
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, invoice, note..."
              className="saas-input pl-10"
            />
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="saas-input"
            >
              <option value="">All Payment Methods</option>
              <option value="bank_transfer">Bank Transfer / Wire</option>
              <option value="credit_card">Credit Card</option>
              <option value="upi">UPI</option>
              <option value="check">Check / Cheque</option>
              <option value="cash">Cash</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="saas-input"
            >
              <option value="">All Statuses</option>
              <option value="successful">Successful</option>
              <option value="refunded">Refunded</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="saas-card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying payment transactions..." />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="No transactions match your current search or filter."
            actionText={!isCustomer ? "Record First Payment" : null}
            onAction={!isCustomer ? onOpenRecordPayment : null}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Reference</th>
                    {!isCustomer && <th className="px-5 py-3">Customer</th>}
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Payment Date</th>
                    <th className="px-5 py-3">Notes</th>
                    <th className="px-5 py-3">Status</th>
                    {isAdmin && <th className="px-5 py-3 text-right">Admin</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-neutral-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{p.payment_reference}</span>
                          <CopyConfirm valueToCopy={p.payment_reference} copyText="" />
                        </div>
                      </td>
                      {!isCustomer && (
                        <td className="px-5 py-3.5 text-neutral-700">
                          <div className="font-semibold text-neutral-900">{p.customer_name}</div>
                          <div className="text-[10px] text-neutral-400">{p.customer_email}</div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 font-medium text-neutral-700">
                        {p.invoice_number || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600">
                        {formatPaymentMethod(p.payment_method)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-700">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500">{formatDate(p.payment_date)}</td>
                      <td className="px-5 py-3.5 text-neutral-400 max-w-xs truncate">
                        {p.notes || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          {p.status === 'successful' && (
                            <button
                              onClick={() => handleRefund(p.id, p.payment_reference)}
                              className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-500/[0.08] hover:bg-rose-500 hover:text-white rounded-full transition-all"
                              title="Process Admin Refund"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" strokeWidth={1.75} />
                              Refund
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
