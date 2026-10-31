import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { ShimmerButton } from '../watermelon/ShimmerButton';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice = null,
  onPaymentSuccess,
}) {
  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // If no preselected invoice, fetch invoices with outstanding balance
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (invoice) {
        setSelectedInvoiceId(invoice.id);
        setSelectedInvoice(invoice);
        setAmount(String(invoice.amount_remaining || ''));
      } else {
        fetchOutstandingInvoices();
      }
    }
  }, [isOpen, invoice]);

  const fetchOutstandingInvoices = async () => {
    try {
      const res = await api.get('/invoices/outstanding');
      const list = res.data.data.invoices || [];
      setInvoicesList(list);
      if (list.length > 0) {
        setSelectedInvoiceId(list[0].id);
        setSelectedInvoice(list[0]);
        setAmount(String(list[0].amount_remaining || ''));
      }
    } catch (err) {
      console.error('Failed to load outstanding invoices:', err);
    }
  };

  const handleInvoiceChange = (id) => {
    setSelectedInvoiceId(id);
    const found = invoicesList.find((i) => i.id === id);
    setSelectedInvoice(found || null);
    if (found) {
      setAmount(String(found.amount_remaining || ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (selectedInvoice && numAmount > parseFloat(selectedInvoice.amount_remaining)) {
      setError(
        `Payment amount (${formatCurrency(numAmount)}) exceeds the remaining balance (${formatCurrency(
          selectedInvoice.amount_remaining
        )}).`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/payments', {
        invoice_id: selectedInvoiceId,
        payment_method: paymentMethod,
        amount: numAmount,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        notes: notes.trim() || undefined,
      });

      const isPaid = res.data.data.is_fully_paid;
      setSuccessMsg(
        isPaid
          ? 'Payment successful! Invoice has been fully paid.'
          : 'Partial payment recorded successfully.'
      );

      setTimeout(() => {
        if (onPaymentSuccess) onPaymentSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? `Record Payment: ${invoice.invoice_number}` : 'Record Manual Payment'}
    >
      {successMsg ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-emerald-600 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-500/[0.1] text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" strokeWidth={2} />
          </div>
          <h4 className="font-semibold text-base text-neutral-900 tracking-tight">{successMsg}</h4>
          <p className="text-xs text-neutral-400 mt-1">Updating records and balances...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/[0.08] border border-rose-500/20 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Selection */}
          {!invoice && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Select Invoice to Settle
              </label>
              {invoicesList.length === 0 ? (
                <p className="text-xs text-amber-600 italic">No unpaid invoices found.</p>
              ) : (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="saas-input"
                >
                  {invoicesList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.customer_name} (Balance:{' '}
                      {formatCurrency(inv.amount_remaining)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Balance Preview Card */}
          {selectedInvoice && (
            <div className="bg-[#F8F9FA] border border-black/[0.04] rounded-[18px] p-4 text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-500">
                <span>Invoice Total:</span>
                <span className="font-medium text-neutral-900">
                  {formatCurrency(selectedInvoice.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Already Paid:</span>
                <span className="font-medium text-emerald-700">
                  {formatCurrency(selectedInvoice.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-900 font-bold border-t border-black/[0.05] pt-1.5">
                <span>Remaining Balance:</span>
                <span className="text-rose-600">
                  {formatCurrency(selectedInvoice.amount_remaining)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="saas-input"
            >
              <option value="bank_transfer">Bank Transfer / Wire</option>
              <option value="credit_card">Credit Card (Simulated Direct)</option>
              <option value="upi">UPI / Instant Pay</option>
              <option value="check">Cheque / Check</option>
              <option value="cash">Cash Settlement</option>
              <option value="manual">Manual / Internal Adjustment</option>
            </select>
          </div>

          {/* Payment Amount */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Amount to Record
              </label>
              {selectedInvoice && (
                <button
                  type="button"
                  onClick={() => setAmount(String(selectedInvoice.amount_remaining))}
                  className="text-[11px] text-neutral-900 hover:text-black font-semibold underline"
                >
                  Set Full Balance ({formatCurrency(selectedInvoice.amount_remaining)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-neutral-400 text-xs font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="saas-input pl-8"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Payment Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="saas-input"
            />
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Optional Note / Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wire reference #TRX-998822 or Cheque #4421"
              className="saas-input"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-black/[0.05]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
            >
              Cancel
            </button>
            <ShimmerButton
              type="submit"
              disabled={loading || !selectedInvoiceId}
              size="md"
              className="text-xs"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
              {loading ? 'Recording...' : 'Record Payment'}
            </ShimmerButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
