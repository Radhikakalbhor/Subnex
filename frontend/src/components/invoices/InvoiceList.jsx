import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';
import Modal from '../common/Modal';
import { ContinuousTabs } from '../watermelon/ContinuousTabs';
import { CopyConfirm } from '../watermelon/CopyConfirm';
import { ShimmerButton } from '../watermelon/ShimmerButton';
import { formatCurrency, formatDate, formatPaymentMethod } from '../../utils/formatters';
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  CreditCard,
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
      <div className="saas-card p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-black/[0.05]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight flex items-center">
              <div className="w-7 h-7 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2.5 text-neutral-800">
                <FileText className="w-4 h-4" strokeWidth={1.75} />
              </div>
              {isCustomer ? 'My Invoices & Billing Statements' : 'Invoices Ledger'}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-normal">
              Itemized charges, payment reconciliations, overdue detection & partial settlements.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {(isAdmin || isStaff) && (
              <ShimmerButton
                onClick={handleTriggerBilling}
                disabled={billingRunning}
                size="sm"
                className="text-xs"
                title="Run node-cron billing evaluation on demand"
              >
                <PlayCircle className={`w-3.5 h-3.5 mr-1.5 ${billingRunning ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                {billingRunning ? 'Running...' : 'Trigger Billing'}
              </ShimmerButton>
            )}
            <button
              onClick={fetchInvoices}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Refresh
            </button>
          </div>
        </div>

        {billingMsg && (
          <div className="mt-4 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-800 text-xs rounded-xl font-medium flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" strokeWidth={2} />
            {billingMsg}
          </div>
        )}

        {/* Search & Continuous Tabs Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pt-5">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, customer name, email..."
              className="saas-input pl-10"
            />
          </div>

          <div className="overflow-x-auto pb-1 lg:pb-0">
            <ContinuousTabs
              tabs={[
                { id: 'all', label: 'All Invoices' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'open', label: 'Open' },
                { id: 'paid', label: 'Paid' },
                { id: 'draft', label: 'Drafts' },
              ]}
              activeId={statusFilter}
              onChange={(id) => {
                setStatusFilter(id);
                setCurrentPage(1);
              }}
              size="sm"
              layoutGroupId="invoice-status-tabs"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="saas-card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying invoice records from database..." />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="No billing records match the selected filter criteria."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
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
                <tbody className="divide-y divide-black/[0.04]">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-neutral-900">
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
                      {!isCustomer && (
                        <td className="px-5 py-3.5 text-neutral-700">
                          <div className="font-semibold text-neutral-900">{inv.customer_name}</div>
                          <div className="text-[10px] text-neutral-400">{inv.customer_email}</div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-neutral-500">{formatDate(inv.issue_date)}</td>
                      <td className="px-5 py-3.5 font-medium text-neutral-700">{formatDate(inv.due_date)}</td>
                      <td className="px-5 py-3.5 font-semibold text-neutral-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-700">
                        {formatCurrency(inv.amount_paid)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-rose-600">
                        {formatCurrency(inv.amount_remaining)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openInvoiceModal(inv.id)}
                          className="w-7 h-7 rounded-full bg-[#F5F6F8] hover:bg-neutral-900 hover:text-white text-neutral-600 inline-flex items-center justify-center transition-all border border-black/[0.04]"
                          title="View Statement & History"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                        {inv.amount_remaining > 0 && inv.status !== 'void' && (!isCustomer) && (
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 rounded-[18px] border border-black/[0.04]">
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Billed To:</span>
                <p className="font-semibold text-neutral-900">{selectedInvoice.customer_name}</p>
                <p className="text-[10px] text-neutral-400">{selectedInvoice.customer_email}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Issue Date:</span>
                <p className="font-semibold text-neutral-800">{formatDate(selectedInvoice.issue_date)}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Due Date:</span>
                <p className="font-semibold text-neutral-800">
                  {formatDate(selectedInvoice.due_date)}
                  {selectedInvoice.is_overdue && (
                    <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-rose-500/[0.1] text-rose-700 rounded-full font-semibold">
                      OVERDUE
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Status:</span>
                <div><StatusBadge status={selectedInvoice.status} /></div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2 tracking-tight">Itemized Charges</h4>
              <div className="border border-black/[0.06] rounded-[18px] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFAFA] text-neutral-400 font-semibold text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                    <tr>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Qty</th>
                      <th className="px-4 py-2.5">Unit Price</th>
                      <th className="px-4 py-2.5">Discount</th>
                      <th className="px-4 py-2.5">Tax</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {(selectedInvoice.lines || []).map((line) => (
                      <tr key={line.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-2.5 font-medium text-neutral-900">{line.description}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{line.quantity}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{formatCurrency(line.unit_price)}</td>
                        <td className="px-4 py-2.5 text-neutral-400">{formatCurrency(line.discount_amount)}</td>
                        <td className="px-4 py-2.5 text-neutral-400">{formatCurrency(line.tax_amount)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-neutral-900">
                          {formatCurrency(line.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-[#F8F9FA] border border-black/[0.04] rounded-[18px] p-4 space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-medium text-neutral-900">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.discount_total > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discounts:</span>
                  <span>-{formatCurrency(selectedInvoice.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Tax Total:</span>
                <span>+{formatCurrency(selectedInvoice.tax_total)}</span>
              </div>
              <div className="flex justify-between text-neutral-900 font-bold border-t border-black/[0.05] pt-2">
                <span>Total Amount:</span>
                <span>{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Amount Paid:</span>
                <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold border-t border-dashed border-neutral-300 pt-1.5">
                <span>Outstanding Balance:</span>
                <span className="text-sm">{formatCurrency(selectedInvoice.amount_remaining)}</span>
              </div>
            </div>

            {/* Payments History on this invoice */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2 flex items-center tracking-tight">
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-neutral-700" strokeWidth={1.75} />
                Payments Reconciled Against This Invoice ({selectedInvoice.payments?.length || 0})
              </h4>
              <div className="border border-black/[0.06] rounded-[18px] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFAFA] text-neutral-400 font-semibold text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                    <tr>
                      <th className="px-4 py-2.5">Reference</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Note</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-neutral-400 italic">
                          No payments recorded on this invoice yet.
                        </td>
                      </tr>
                    ) : (
                      selectedInvoice.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-neutral-800">{p.payment_reference}</td>
                          <td className="px-4 py-2.5 text-neutral-600">{formatPaymentMethod(p.payment_method)}</td>
                          <td className="px-4 py-2.5 font-semibold text-emerald-700">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-2.5 text-neutral-500">{formatDate(p.payment_date)}</td>
                          <td className="px-4 py-2.5 text-neutral-400 truncate max-w-xs">{p.notes || '—'}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-black/[0.05]">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-[#F5F6F8] hover:bg-[#EAEBED] text-neutral-800 font-medium rounded-full transition-all text-xs border border-black/[0.04]"
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
                  className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-semibold rounded-full shadow-xs text-xs transition-all active:scale-[0.98]"
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
