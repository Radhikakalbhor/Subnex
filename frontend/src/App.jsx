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
  HelpCircle,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-indigo-600 text-white font-black text-2xl rounded-2xl w-14 h-14 shadow-xl shadow-indigo-500/20 mb-4">
            SX
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            SUBNEX Enterprise
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            One Platform. Every Subscription. Complete Control.
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            Phase 6: Live Production Dashboards & Customer Portal
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 mb-6">
            <button
              onClick={() => { setActiveTab('quick'); setLocalError(null); }}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'quick'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              1-Click Demo Roles
            </button>
            <button
              onClick={() => { setActiveTab('login'); setLocalError(null); }}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'login'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setLocalError(null); }}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'register'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              New Customer Registration
            </button>
          </div>

          {(localError || authError) && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Tab 1: 1-Click Demo Profiles */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 mb-3">
                Select a preset role to immediately test the role-specific dashboard views, permissions, and features with real PostgreSQL database records:
              </p>

              {/* Admin Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="w-full text-left p-4 rounded-2xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                      Admin / Finance Dashboard
                    </div>
                    <div className="text-xs text-slate-400">
                      Total revenue, overdue analytics, pagination, refunds & customer registry
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Staff Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                disabled={loading}
                className="w-full text-left p-4 rounded-2xl bg-slate-900/60 hover:bg-purple-950/40 border border-slate-700 hover:border-purple-500 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                      Staff Operations Panel
                    </div>
                    <div className="text-xs text-slate-400">
                      Manage subscriptions, trigger billing runs, audit customer registry
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Customer Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('customer')}
                disabled={loading}
                className="w-full text-left p-4 rounded-2xl bg-slate-900/60 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                      Customer Self-Service Portal
                    </div>
                    <div className="text-xs text-slate-400">
                      View active subscriptions, renewal dates, invoice history & pay balances
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          )}

          {/* Tab 2: Standard Sign In */}
          {activeTab === 'login' && (
            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </form>
          )}

          {/* Tab 3: Customer Registration */}
          {activeTab === 'register' && (
            <form onSubmit={handleStandardRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Company Name (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Globex Corporation"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@globex.com"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password (min 8 chars, 1 upper, 1 special)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Register Customer Account'}
              </button>
            </form>
          )}
        </div>

        {/* Security & System Info Footer */}
        <div className="mt-8 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-4">
          <span className="flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" />
            Live PostgreSQL Data
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Connecting to SUBNEX PostgreSQL backend..." />
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
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
