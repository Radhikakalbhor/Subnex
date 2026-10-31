import BorderGlow from '../common/BorderGlow';
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
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Layers,
  Pause,
  Play,
  XCircle,
  Eye,
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
      <div className="saas-card p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-black/[0.05]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight flex items-center">
              <div className="w-7 h-7 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2.5 text-neutral-800">
                <Layers className="w-4 h-4" strokeWidth={1.75} />
              </div>
              {isCustomer ? 'My Subscriptions' : 'Subscriptions Registry'}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-normal">
              Lifecycle status tracking, recurrence schedules, and line item configurations.
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            className="self-start sm:self-auto inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            Refresh
          </button>
        </div>

        {/* Action alert message */}
        {actionMsg && (
          <div className="mt-4 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-800 text-xs rounded-xl font-medium">
            {actionMsg}
          </div>
        )}

        {/* Search & Continuous Tabs Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pt-5">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search all subscriptions by number, customer, email..."
              className="saas-input pl-10"
            />
          </div>

          <div className="overflow-x-auto pb-1 lg:pb-0">
            <ContinuousTabs
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'paused', label: 'Paused' },
                { id: 'past_due', label: 'Past Due' },
                { id: 'quotation', label: 'Quotation' },
                { id: 'closed', label: 'Closed' },
              ]}
              activeId={statusFilter}
              onChange={(id) => {
                setStatusFilter(id);
                setCurrentPage(1);
              }}
              size="sm"
              layoutGroupId="sub-status-tabs"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="saas-card overflow-hidden">
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
                <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
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
                <tbody className="divide-y divide-black/[0.04]">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-neutral-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{sub.subscription_number}</span>
                          <CopyConfirm valueToCopy={sub.subscription_number} copyText="" />
                        </div>
                      </td>
                      {!isCustomer && (
                        <td className="px-5 py-3.5 text-neutral-700">
                          <div className="font-semibold text-neutral-900">{sub.customer_name}</div>
                          <div className="text-[10px] text-neutral-400">{sub.customer_email}</div>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 font-medium">
                        {formatDate(sub.next_billing_date)}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 font-medium">
                        {sub.payment_terms || 'Net 30'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-neutral-900">
                        {formatCurrency(sub.grand_total || sub.recurring_total || 0, sub.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDetailsModal(sub.id)}
                          className="w-7 h-7 rounded-full bg-[#F5F6F8] hover:bg-neutral-900 hover:text-white text-neutral-600 inline-flex items-center justify-center transition-all border border-black/[0.04]"
                          title="View Lines & Details"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>

                        {(isAdmin || isStaff) && (
                          <>
                            {sub.status === 'active' && (
                              <button
                                onClick={() => handleTransition(sub.id, 'paused')}
                                className="w-7 h-7 rounded-full bg-amber-500/[0.1] hover:bg-amber-500 hover:text-white text-amber-700 inline-flex items-center justify-center transition-all"
                                title="Pause Recurring Billing"
                              >
                                <Pause className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </button>
                            )}
                            {sub.status === 'paused' && (
                              <button
                                onClick={() => handleTransition(sub.id, 'active')}
                                className="w-7 h-7 rounded-full bg-emerald-500/[0.1] hover:bg-emerald-500 hover:text-white text-emerald-700 inline-flex items-center justify-center transition-all"
                                title="Resume Subscription"
                              >
                                <Play className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </button>
                            )}
                            {['active', 'paused', 'confirmed'].includes(sub.status) && (
                              <button
                                onClick={() => handleTransition(sub.id, 'closed')}
                                className="w-7 h-7 rounded-full bg-rose-500/[0.1] hover:bg-rose-500 hover:text-white text-rose-700 inline-flex items-center justify-center transition-all"
                                title="Close Subscription"
                              >
                                <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8F9FA] p-4 rounded-[18px] border border-black/[0.04]">
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Customer:</span>
                <p className="font-semibold text-neutral-900">{selectedSub.customer_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Status:</span>
                <div><StatusBadge status={selectedSub.status} /></div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Next Billing:</span>
                <p className="font-semibold text-neutral-900">{formatDate(selectedSub.next_billing_date)}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Period Start:</span>
                <p className="font-medium text-neutral-700">{formatDate(selectedSub.current_period_start)}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Period End:</span>
                <p className="font-medium text-neutral-700">{formatDate(selectedSub.current_period_end)}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Payment Terms:</span>
                <p className="font-medium text-neutral-700">{selectedSub.payment_terms || 'Net 30'}</p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2 tracking-tight">Subscription Line Items</h4>
              <div className="border border-black/[0.06] rounded-[18px] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFAFA] text-neutral-400 font-semibold text-[11px] uppercase tracking-wider border-b border-black/[0.05]">
                    <tr>
                      <th className="px-4 py-2.5">Item / Plan</th>
                      <th className="px-4 py-2.5">Quantity</th>
                      <th className="px-4 py-2.5">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {(selectedSub.lines || []).map((l, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-2.5 font-medium text-neutral-900">
                          {l.plan_name || l.product_name || 'Plan Item'}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">{l.quantity}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{formatCurrency(l.unit_price)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-neutral-900">
                          {formatCurrency(l.total_amount || l.unit_price * l.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-black/[0.05] font-bold text-sm">
              <span className="text-neutral-900">Grand Total:</span>
              <span className="text-neutral-950 text-base">
                {formatCurrency(selectedSub.grand_total || selectedSub.recurring_total || 0, selectedSub.currency)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
