import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';
import Modal from '../common/Modal';
import { formatCurrency, formatDate, formatPaymentMethod } from '../../utils/formatters';
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
} from 'lucide-react';

export default function InvoiceList({ onRecordPaymentForInvoice }) {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Selected invoice for detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Billing trigger status
  const [billingMsg, setBillingMsg] = useState(null);
  const [billingRunning, setBillingRunning] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };
      if (statusFilter === 'overdue') {
        params.status = 'overdue';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await api.get('/invoices', { params });
      setInvoices(res.data.data?.invoices || []);
      setTotalCount(res.data.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, currentPage]);

  const openInvoiceModal = async (id) => {
    setModalLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setSelectedInvoice(res.data.data.invoice);
    } catch (err) {
      alert('Failed to load invoice details: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleTriggerBilling = async () => {
    if (!window.confirm('Trigger immediate automated billing cycle check across all due subscriptions?')) {
      return;
    }
    setBillingRunning(true);
    setBillingMsg(null);
    try {
      const res = await api.post('/invoices/trigger-billing', {
        targetDate: new Date().toISOString(),
        status: 'confirmed',
      });
      const generated = res.data.data?.generated_count || 0;
      setBillingMsg(`Billing engine executed: Generated ${generated} new invoice(s).`);
      fetchInvoices();
    } catch (err) {
      alert('Billing run failed: ' + err.message);
    } finally {
      setBillingRunning(false);
    }
  };

  // Client-side search filtering
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.customer_name?.toLowerCase().includes(term) ||
      inv.customer_email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              {isCustomer ? 'My Invoices & Billing Statements' : 'Invoices Ledger'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized charges, payment reconciliations, overdue detection & partial settlements.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {(isAdmin || isStaff) && (
              <button
                onClick={handleTriggerBilling}
                disabled={billingRunning}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                title="Run node-cron billing evaluation on demand"
              >
                <PlayCircle className={`w-3.5 h-3.5 mr-1.5 ${billingRunning ? 'animate-spin' : ''}`} />
                {billingRunning ? 'Running...' : 'Trigger Billing'}
              </button>
            )}
            <button
              onClick={fetchInvoices}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {billingMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
            {billingMsg}
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, customer name, email..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
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
              <option value="all">All Invoices</option>
              <option value="overdue">Overdue Invoices</option>
              <option value="open">Open / Confirmed</option>
              <option value="paid">Fully Paid</option>
              <option value="draft">Drafts</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying invoice records from PostgreSQL..." />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="No billing records match the selected filter criteria."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Invoice #</th>
                    {!isCustomer && <th className="px-5 py-3">Customer</th>}
                    <th className="px-5 py-3">Issue Date</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Total Amount</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Remaining</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {inv.invoice_number}
                        {inv.is_overdue && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold uppercase rounded">
                            Overdue
                          </span>
                        )}
                      </td>
                      {!isCustomer && (
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                          <div className="text-[10px] text-slate-500">{inv.customer_email}</div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(inv.issue_date)}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{formatDate(inv.due_date)}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-emerald-600">
                        {formatCurrency(inv.amount_paid)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-rose-600">
                        {formatCurrency(inv.amount_remaining)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openInvoiceModal(inv.id)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Statement & History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inv.amount_remaining > 0 && inv.status !== 'void' && (!isCustomer) && (
                          <button
                            onClick={() => onRecordPaymentForInvoice(inv)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                          >
                            Pay
                          </button>
                        )}
                      </td>
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

      {/* Invoice Details & Payment History Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Statement: ${selectedInvoice.invoice_number}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium">Billed To:</span>
                <p className="font-bold text-slate-900">{selectedInvoice.customer_name}</p>
                <p className="text-[10px] text-slate-500">{selectedInvoice.customer_email}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Issue Date:</span>
                <p className="font-semibold text-slate-800">{formatDate(selectedInvoice.issue_date)}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Due Date:</span>
                <p className="font-bold text-slate-800">
                  {formatDate(selectedInvoice.due_date)}
                  {selectedInvoice.is_overdue && (
                    <span className="ml-1 text-[9px] px-1 bg-rose-100 text-rose-700 rounded font-bold">
                      OVERDUE
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Status:</span>
                <div><StatusBadge status={selectedInvoice.status} /></div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Itemized Charges</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit Price</th>
                      <th className="px-3 py-2">Discount</th>
                      <th className="px-3 py-2">Tax</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedInvoice.lines || []).map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">{line.description}</td>
                        <td className="px-3 py-2 text-slate-700">{line.quantity}</td>
                        <td className="px-3 py-2 text-slate-700">{formatCurrency(line.unit_price)}</td>
                        <td className="px-3 py-2 text-slate-500">{formatCurrency(line.discount_amount)}</td>
                        <td className="px-3 py-2 text-slate-500">{formatCurrency(line.tax_amount)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {formatCurrency(line.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 max-w-xs ml-auto">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.discount_total > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts:</span>
                  <span>-{formatCurrency(selectedInvoice.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax Total:</span>
                <span>+{formatCurrency(selectedInvoice.tax_total)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Total Amount:</span>
                <span>{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Amount Paid:</span>
                <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                <span>Outstanding Balance:</span>
                <span className="text-sm">{formatCurrency(selectedInvoice.amount_remaining)}</span>
              </div>
            </div>

            {/* Payments History on this invoice */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Payments Reconciled Against This Invoice ({selectedInvoice.payments?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-slate-400 italic">
                          No payments recorded on this invoice yet.
                        </td>
                      </tr>
                    ) : (
                      selectedInvoice.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">{p.payment_reference}</td>
                          <td className="px-3 py-2 text-slate-700">{formatPaymentMethod(p.payment_method)}</td>
                          <td className="px-3 py-2 font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                          <td className="px-3 py-2 text-slate-500">{formatDate(p.payment_date)}</td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-xs">{p.notes || '—'}</td>
                          <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>
              {selectedInvoice.amount_remaining > 0 && selectedInvoice.status !== 'void' && (!isCustomer) && (
                <button
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    onRecordPaymentForInvoice(inv);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Record Payment ({formatCurrency(selectedInvoice.amount_remaining)})
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

