import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { RoleBadge } from '../common/Badge';
import { CopyConfirm } from '../watermelon/CopyConfirm';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import BorderGlow from '../common/BorderGlow';
import { formatDate } from '../../utils/formatters';
import { Users, Search, RefreshCw, Building } from 'lucide-react';

export default function CustomerList({ onSelectCustomer }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users?limit=100');
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.company_name?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <BorderGlow
        edgeSensitivity={30}
        glowColor="40 80 80"
        backgroundColor="#FFFFFF"
        borderRadius={22}
        glowRadius={40}
        glowIntensity={1}
        coneSpread={25}
        animated={false}
        colors={['#c084fc', '#f472b6', '#38bdf8']}
        className="border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
      >
        <div className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-black/[0.05]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight flex items-center">
                <div className="w-7 h-7 rounded-full bg-[#F5F6F8] flex items-center justify-center mr-2.5 text-neutral-800">
                  <Users className="w-4 h-4" strokeWidth={1.75} />
                </div>
                Customer & User Registry
              </h1>
              <p className="text-xs text-neutral-500 mt-1 font-normal">
                Verified subscriber accounts, company details and role authorization levels.
              </p>
            </div>
            <button
              onClick={fetchUsers}
              className="self-start sm:self-auto inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-[#F5F6F8] hover:bg-[#EAEBED] rounded-full border border-black/[0.04] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="pt-5 max-w-md relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer by name, organization, email..."
              className="saas-input pl-10"
            />
          </div>
        </div>
      </BorderGlow>

      {/* Users Grid */}
      <BorderGlow
        edgeSensitivity={30}
        glowColor="40 80 80"
        backgroundColor="#FFFFFF"
        borderRadius={22}
        glowRadius={40}
        glowIntensity={1}
        coneSpread={25}
        animated={false}
        colors={['#c084fc', '#f472b6', '#38bdf8']}
        className="border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        {loading ? (
          <LoadingSpinner message="Fetching user directory..." />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="No user records match your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-black/[0.05] text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Joined Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{u.full_name}</td>
                    <td className="px-5 py-3.5 text-neutral-600 font-medium">
                      {u.company_name ? (
                        <span className="flex items-center">
                          <Building className="w-3.5 h-3.5 mr-1.5 text-neutral-400" strokeWidth={1.75} />
                          {u.company_name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 font-mono text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span>{u.email}</span>
                        <CopyConfirm valueToCopy={u.email} copyText="" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-3.5 text-neutral-400">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-500/[0.08] px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BorderGlow>
    </div>
  );
}
