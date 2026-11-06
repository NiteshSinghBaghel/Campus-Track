import React, { useState, useEffect } from 'react';
import { useAccounts } from '../context/AccountContext.js';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Share,
  PlusSquare,
  Check
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const LoginPage: React.FC = () => {
  const { login } = useAccounts();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt event (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(prev => !prev);
    } else {
      // General instructions modal/alert for browsers that don't support beforeinstallprompt
      alert('To install Campus Track app:\n\n• On Chrome / Android: tap 3-dots (menu) → "Add to Home screen" or "Install App".\n• On iPhone: tap Share icon → "Add to Home Screen".');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your PRN/ERP Username and Password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative">
      {/* Top Banner: Install App Button (hidden completely once installed) */}
      {!isInstalled && (
        <div className="w-full max-w-md mb-4 animate-in fade-in slide-in-from-top-3">
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shrink-0 shadow-md">
                <Download className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Install Campus Track App</p>
                <p className="text-[10px] text-indigo-300 truncate">Add to phone home screen (PWA)</p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          </div>

          {/* iOS Safari Instructions Accordion */}
          {showIOSInstructions && isIOS && (
            <div className="mt-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 text-indigo-400" /> Install on iPhone / Safari:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                <li>Tap the <strong>Share</strong> button at bottom of Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3 h-3 inline text-slate-400" /></li>
                <li>Tap <strong>"Add"</strong> in top right corner</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Installed banner removed as requested */}

      <div className="w-full max-w-md">
        {/* App Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/30 mb-4 animate-in zoom-in-50">
            <img src="/icons/icon-192.png" alt="Campus Track" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Campus Track</h1>
          <p className="text-sm text-indigo-300 font-medium mt-1">
            D. Y. Patil International University (DYPIU)
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Official Juno ERP Student Portal
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Student Login</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Login with your ERP credentials. This will become your <strong>Primary Account</strong>. You can link and manage your peers' accounts inside.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                PRN / Juno Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 26015060100 or student email"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                ERP Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating with Juno ERP...</span>
                </>
              ) : (
                <>
                  <span>Login to Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Security Guarantee */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Credentials encrypted with AES-256 GCM on device.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Never auto-logs out. Persistent multi-account dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
