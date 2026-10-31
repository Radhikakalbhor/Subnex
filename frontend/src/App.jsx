import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import AdminDashboard from './components/dashboard/AdminDashboard';
import CustomerPortal from './components/dashboard/CustomerPortal';
import SubscriptionList from './components/subscriptions/SubscriptionList';
import InvoiceList from './components/invoices/InvoiceList';
import PaymentList from './components/payments/PaymentList';
import CustomerList from './components/customers/CustomerList';
import RecordPaymentModal from './components/payments/RecordPaymentModal';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ContinuousTabs } from './components/watermelon/ContinuousTabs';
import { ShimmerButton } from './components/watermelon/ShimmerButton';
import api from './services/api';
import {
  Shield,
  Layers,
  Users,
  CreditCard,
  Lock,
  Mail,
  User,
  Building,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function AuthScreen() {
  const { login, register, quickLoginAs, error: authError } = useAuth();
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleQuickLogin = async (role) => {
    setLoading(true);
    setLocalError(null);
    try {
      const res = await quickLoginAs(role);
      if (!res.success) {
        setLocalError(res.error || 'Quick login failed');
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setLocalError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStandardRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      const res = await register({
        email,
        password,
        full_name: fullName,
        company_name: companyName,
      });
      if (!res.success) {
        setLocalError(res.error || 'Registration failed');
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-neutral-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-neutral-950 text-white font-bold text-xl rounded-[18px] w-14 h-14 shadow-xs mb-4">
            SX
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            SUBNEX Enterprise
          </h1>
          <p className="mt-1 text-xs text-neutral-500 font-normal">
            One Platform. Every Subscription. Complete Control.
          </p>
          <div className="mt-3.5 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-white text-neutral-700 border border-black/[0.06] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-neutral-800" strokeWidth={1.75} />
            Phase 6: Live Production Dashboards & Customer Portal
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-[28px] border border-black/[0.06] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          {/* Watermelon Continuous Tabs */}
          <div className="flex justify-center mb-6">
            <ContinuousTabs
              tabs={[
                { id: 'quick', label: '1-Click Demo' },
                { id: 'login', label: 'Sign In' },
                { id: 'register', label: 'Register' },
              ]}
              activeId={activeTab}
              onChange={(id) => {
                setActiveTab(id);
                setLocalError(null);
              }}
              className="w-full justify-between"
              layoutGroupId="auth-tabs"
            />
          </div>

          {(localError || authError) && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20 text-rose-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" strokeWidth={2} />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Tab 1: 1-Click Demo Profiles */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                Select a preset role to immediately test the role-specific dashboard views, permissions, and features with real database records:
              </p>

              {/* Admin Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="w-full text-left p-4 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-black/[0.04] hover:border-black/[0.08] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-white border border-black/[0.05] text-neutral-800 flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 text-xs tracking-tight">
                      Admin / Finance Dashboard
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Total revenue, overdue analytics, pagination, refunds & customer registry
                    </div>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
              </button>

              {/* Staff Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                disabled={loading}
                className="w-full text-left p-4 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-black/[0.04] hover:border-black/[0.08] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-white border border-black/[0.05] text-neutral-800 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 text-xs tracking-tight">
                      Staff Operations Panel
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Manage subscriptions, trigger billing runs, audit customer registry
                    </div>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
              </button>

              {/* Customer Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('customer')}
                disabled={loading}
                className="w-full text-left p-4 rounded-[20px] bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-black/[0.04] hover:border-black/[0.08] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-white border border-black/[0.05] text-neutral-800 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 text-xs tracking-tight">
                      Customer Self-Service Portal
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      View active subscriptions, renewal dates, invoice history & pay balances
                    </div>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
              </button>
            </div>
          )}

          {/* Tab 2: Standard Sign In */}
          {activeTab === 'login' && (
            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="saas-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="saas-input pl-10"
                  />
                </div>
              </div>

              <ShimmerButton
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 text-xs"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </ShimmerButton>
            </form>
          )}

          {/* Tab 3: Customer Registration */}
          {activeTab === 'register' && (
            <form onSubmit={handleStandardRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="saas-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Company Name (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Globex Corporation"
                    className="saas-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@globex.com"
                    className="saas-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Password (min 8 chars, 1 upper, 1 special)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.75} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="saas-input pl-10"
                  />
                </div>
              </div>

              <ShimmerButton
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 text-xs"
              >
                {loading ? 'Creating Account...' : 'Register Customer Account'}
              </ShimmerButton>
            </form>
          )}
        </div>

        {/* Security & System Info Footer */}
        <div className="mt-8 text-center text-[11px] text-neutral-400 flex items-center justify-center space-x-3">
          <span className="flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" strokeWidth={2} />
            Live Database Connected
          </span>
          <span>•</span>
          <span>JWT RBAC Enforced</span>
          <span>•</span>
          <span>Zero Mock Data</span>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const { user, loading, isAuthenticated, isCustomer, isAdmin, isStaff } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  // Fetch overdue invoice count for sidebar alert badge
  const fetchOverdueCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/invoices/overdue');
      const count = res.data.data?.invoices?.length || 0;
      setOverdueCount(count);
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOverdueCount();
    }
  }, [isAuthenticated, user?.id]);

  // If customer navigates to forbidden view (e.g. customers registry), reset to dashboard
  useEffect(() => {
    if (isCustomer && currentView === 'customers') {
      setCurrentView('dashboard');
    }
  }, [isCustomer, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <LoadingSpinner message="Connecting to SUBNEX backend..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleOpenRecordPayment = () => {
    setSelectedInvoiceForPayment(null);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentForInvoice = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchOverdueCount();
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-neutral-900 flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        onOpenRecordPayment={handleOpenRecordPayment}
        currentView={currentView}
        onSelectView={setCurrentView}
      />

      {/* Main Body Shell */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Role-Aware Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          overdueCount={overdueCount}
        />

        {/* View Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentView === 'dashboard' && (
            isCustomer ? (
              <CustomerPortal
                onOpenRecordPayment={handleOpenRecordPayment}
                onRecordPaymentForInvoice={handleRecordPaymentForInvoice}
              />
            ) : (
              <AdminDashboard
                onSelectView={setCurrentView}
                onRecordPaymentForInvoice={handleRecordPaymentForInvoice}
              />
            )
          )}

          {currentView === 'subscriptions' && <SubscriptionList />}

          {currentView === 'invoices' && (
            <InvoiceList onRecordPaymentForInvoice={handleRecordPaymentForInvoice} />
          )}

          {currentView === 'payments' && (
            <PaymentList onOpenRecordPayment={handleOpenRecordPayment} />
          )}

          {currentView === 'customers' && (isAdmin || isStaff) && (
            <CustomerList />
          )}
        </main>
      </div>

      {/* Global Manual Payment Recording Modal (Staff / Admin only) */}
      {(isAdmin || isStaff) && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          invoice={selectedInvoiceForPayment}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
