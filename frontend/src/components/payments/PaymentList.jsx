import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-emerald-600" />
              {isCustomer ? 'My Payment History' : 'Payment Transactions & Reconciliation'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified manual payment audit ledger, method allocations and refunds.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isCustomer && (
              <button
                onClick={onOpenRecordPayment}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Record Payment
              </button>
            )}
            <button
              onClick={fetchPayments}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {refundMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
            {refundMsg}
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, invoice, note..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {p.payment_reference}
                      </td>
                      {!isCustomer && (
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="font-semibold text-slate-900">{p.customer_name}</div>
                          <div className="text-[10px] text-slate-500">{p.customer_email}</div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {p.invoice_number || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {formatPaymentMethod(p.payment_method)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
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
                              className="inline-flex items-center px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                              title="Process Admin Refund"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
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

            {/* Pagination */}
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

