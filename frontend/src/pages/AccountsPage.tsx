import React, { useState } from 'react';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Building,
  GraduationCap
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const { accounts, activeAccount, setActiveAccount, refreshAccounts, syncAccount, removeAccount } = useAccounts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [consentGranted, setConsentGranted] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGranted) {
      setErrorMsg('Explicit authorization from the student account owner is mandatory.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.linkAccount({
        username,
        password,
        grantorConsent: consentGranted,
        isPrimary
      });
      setSuccessMsg(res.message);
      setUsername('');
      setPassword('');
      setConsentGranted(false);
      setShowAddModal(false);
      await refreshAccounts();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncingId(id);
      await syncAccount(id);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Connected Student Accounts</h2>
          <p className="text-sm text-slate-500">
            Manage multiple authorized student profiles for coordinated attendance and schedule tracking.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Connect Student Account
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Accounts List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(acc => {
          const isActive = activeAccount?.id === acc.id;
          const isSyncing = syncingId === acc.id;

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-white font-bold text-base flex items-center justify-center shrink-0">
                    {acc.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{acc.studentName}</h3>
                      {acc.isPrimary && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{acc.prn} • {acc.program}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Building className="w-3 h-3" /> D. Y. Patil International University
                    </p>
                    {acc.lastSyncedAt && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Last sync: {new Date(acc.lastSyncedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                    acc.connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {acc.connectionStatus}
                </span>
              </div>

              {/* Attendance Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">ERP Verified Attendance</span>
                  <span className="font-extrabold text-slate-900">{acc.attendancePercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      acc.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${acc.attendancePercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveAccount(acc)}
                  disabled={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 cursor-default'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isActive ? 'Active Profile' : 'Switch to Profile'}
                </button>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => handleSync(acc.id)}
                    disabled={isSyncing}
                    title="Sync with DYPIU Juno ERP"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>

                  <button
                    onClick={() => removeAccount(acc.id)}
                    title="Remove Account"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Connect Juno Student Account</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter your official DYPIU Juno ERP credentials. Credentials are encrypted server-side with AES-256-GCM.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Juno Username (PRN or Email)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DYPIU2023001"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Juno Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGranted}
                    onChange={e => setConsentGranted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-600 leading-tight">
                    <strong>Explicit Owner Consent:</strong> I confirm that I am the account owner or have obtained explicit permission from the student to coordinate authorized attendance.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md disabled:opacity-50"
                >
                  {loading ? 'Authenticating with DYPIU...' : 'Connect Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

