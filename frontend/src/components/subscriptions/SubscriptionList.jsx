import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';
import Modal from '../common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Layers,
  Pause,
  Play,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function SubscriptionList() {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Selected subscription for details modal
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Action status message
  const [actionMsg, setActionMsg] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/subscriptions', { params });
      const data = res.data.data;
      if (data && data.subscriptions) {
        setSubscriptions(data.subscriptions);
        setTotalCount(data.total || 0);
      } else if (Array.isArray(data)) {
        setSubscriptions(data);
        setTotalCount(data.length);
      } else {
        setSubscriptions([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, currentPage, searchTerm]);

  const handleTransition = async (subId, targetStatus) => {
    setActionMsg(null);
    try {
      if (targetStatus === 'paused') {
        await api.patch(`/subscriptions/${subId}/pause`);
      } else if (targetStatus === 'active') {
        await api.patch(`/subscriptions/${subId}/resume`);
      } else {
        await api.patch(`/subscriptions/${subId}/status`, { status: targetStatus });
      }
      setActionMsg(`Subscription successfully transitioned to '${targetStatus}'.`);
      fetchSubscriptions();
      if (selectedSub?.id === subId) {
        openDetailsModal(subId);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Transition failed');
    }
  };

  const openDetailsModal = async (subId) => {
    setModalLoading(true);
    try {
      const res = await api.get(`/subscriptions/${subId}`);
      setSelectedSub(res.data.data);
    } catch (err) {
      alert('Failed to load subscription details: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
              <Layers className="w-5 h-5 mr-2 text-indigo-600" />
              {isCustomer ? 'My Subscriptions' : 'Subscriptions Registry'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lifecycle status tracking, recurrence schedules, and line item configurations.
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            className="self-start sm:self-auto inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Action alert message */}
        {actionMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
            {actionMsg}
          </div>
        )}

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search all subscriptions by number, customer, email..."
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
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="confirmed">Confirmed</option>
              <option value="quotation">Quotation</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading subscriptions..." />
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions match your query"
            description="Try adjusting your status filter or search parameters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Subscription #</th>
                    {!isCustomer && <th className="px-5 py-3">Customer</th>}
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Next Billing</th>
                    <th className="px-5 py-3">Terms</th>
                    <th className="px-5 py-3">Recurring Total</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {sub.subscription_number}
                      </td>
                      {!isCustomer && (
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                          <div className="text-[10px] text-slate-500">{sub.customer_email}</div>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {formatDate(sub.next_billing_date)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {sub.payment_terms || 'Net 30'}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {formatCurrency(sub.grand_total || sub.recurring_total || 0, sub.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDetailsModal(sub.id)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Lines & Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(isAdmin || isStaff) && (
                          <>
                            {sub.status === 'active' && (
                              <button
                                onClick={() => handleTransition(sub.id, 'paused')}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Pause Recurring Billing"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}
                            {sub.status === 'paused' && (
                              <button
                                onClick={() => handleTransition(sub.id, 'active')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Resume Subscription"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {['active', 'paused', 'confirmed'].includes(sub.status) && (
                              <button
                                onClick={() => handleTransition(sub.id, 'closed')}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Close Subscription"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination (Requirement 8) */}
            <Pagination
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription Details: ${selectedSub.subscription_number}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium">Customer:</span>
                <p className="font-bold text-slate-900">{selectedSub.customer_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Status:</span>
                <div><StatusBadge status={selectedSub.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Next Billing:</span>
                <p className="font-semibold text-indigo-700">{formatDate(selectedSub.next_billing_date)}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Period Start:</span>
                <p className="font-semibold text-slate-800">{formatDate(selectedSub.current_period_start)}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Period End:</span>
                <p className="font-semibold text-slate-800">{formatDate(selectedSub.current_period_end)}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Payment Terms:</span>
                <p className="font-semibold text-slate-800">{selectedSub.payment_terms || 'Net 30'}</p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Subscription Line Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Item / Plan</th>
                      <th className="px-3 py-2">Quantity</th>
                      <th className="px-3 py-2">Unit Price</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedSub.lines || []).map((l, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {l.plan_name || l.product_name || 'Plan Item'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{l.quantity}</td>
                        <td className="px-3 py-2 text-slate-700">{formatCurrency(l.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {formatCurrency(l.total_amount || l.unit_price * l.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 font-bold text-sm">
              <span>Grand Total:</span>
              <span className="text-indigo-600 text-base">
                {formatCurrency(selectedSub.grand_total || selectedSub.recurring_total || 0, selectedSub.currency)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

