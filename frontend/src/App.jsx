import React, { useState, useEffect } from 'react';
import api from './services/api';
import { CheckCircle2, XCircle, RefreshCw, Layers, ShieldCheck, Database, CreditCard } from 'lucide-react';

export default function App() {
  const [healthStatus, setHealthStatus] = useState({ loading: true, online: false, data: null, error: null });

  const checkBackendHealth = async () => {
    setHealthStatus({ loading: true, online: false, data: null, error: null });
    try {
      const response = await api.get('/health');
      setHealthStatus({ loading: false, online: true, data: response.data, error: null });
    } catch (err) {
      setHealthStatus({
        loading: false,
        online: false,
        data: null,
        error: err.response?.data?.message || err.message,
      });
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white font-black text-xl rounded-lg w-10 h-10 flex items-center justify-center shadow-sm">
              SX
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900">SUBNEX</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded-full border border-indigo-200">
                v1.0.0 (Phases 0–3)
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={checkBackendHealth}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${healthStatus.loading ? 'animate-spin' : ''}`} />
              Re-probe API
            </button>
            <span
              className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                healthStatus.online
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {healthStatus.online ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  API Connected
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  API Standby
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              One Platform. Every Subscription. Complete Control.
            </h1>
            <p className="mt-3 text-base text-slate-300">
              Enterprise Subscription Management Platform with automated recurring billing, quotation workflows,
              normalized PostgreSQL database schemas, and multi-tenant customer isolation.
            </p>
          </div>
        </div>

        {/* Audit Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Phase 0 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Phase 0</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Architecture & Schema</h3>
            <p className="text-xs text-slate-500">
              PLAN.md specification, 14 normalized PostgreSQL tables, and project scaffolding.
            </p>
          </div>

          {/* Phase 1 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Phase 1</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Auth & RBAC</h3>
            <p className="text-xs text-slate-500">
              JWT, bcrypt, 3 roles (Admin, Staff, Customer), Nodemailer password reset, and customer data isolation.
            </p>
          </div>

          {/* Phase 2 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Phase 2</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Catalog & Pricing</h3>
            <p className="text-xs text-slate-500">
              Products, variants, 4 billing intervals (day, week, month, year), tax rules, and discount configurations.
            </p>
          </div>

          {/* Phase 3 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Phase 3</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Subscriptions Core</h3>
            <p className="text-xs text-slate-500">
              Quotations, lines, taxes/totals calculation, 5-stage status workflow, and plan permission enforcements.
            </p>
          </div>
        </div>

        {/* Backend Connectivity Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-indigo-600" />
            Backend API Connectivity & Health Check
          </h2>
          <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs border border-slate-200">
            <div>
              <strong>Target URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}
            </div>
            <div className="mt-2">
              <strong>Health Probe Status:</strong>{' '}
              {healthStatus.loading ? (
                <span className="text-indigo-600">Testing connection...</span>
              ) : healthStatus.online ? (
                <span className="text-emerald-700 font-bold">
                  200 OK — {JSON.stringify(healthStatus.data)}
                </span>
              ) : (
                <span className="text-rose-600 font-bold">Offline / Standby ({healthStatus.error})</span>
              )}
            </div>
          </div>
        </div>

        {/* Roadmap & Next Phases Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
          <h3 className="font-bold text-sm mb-2 flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-amber-700" />
            Pre-Launch Audit Checklist Status
          </h3>
          <ul className="text-xs space-y-1.5 list-disc list-inside text-amber-800">
            <li><strong>Phases 0–3:</strong> Fully implemented on backend and validated through 110 automated assertions.</li>
            <li><strong>Frontend Scaffolding:</strong> Initialized with Vite, Tailwind CSS, Axios, and connectivity probes.</li>
            <li><strong>Pending Subsequent Prompts:</strong> Phase 4 (Invoices & Payments), Phase 5 (Scheduled Billing Cron), and Phase 6 (Full Frontend Dashboards).</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

