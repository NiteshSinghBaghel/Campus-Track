import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext.js';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { accounts, activeAccount, setActiveAccount } = useAccounts();
  const location = useLocation();
  const isScannerPage = location.pathname === '/scanner';

  if (isScannerPage) {
    return (
      <div className="w-full h-screen bg-black overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 p-4 shrink-0">
        <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-800 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Campus Track</h1>
            <p className="text-xs text-indigo-400 font-medium">DYPIU Juno ERP</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>

          <NavLink
            to="/accounts"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Users className="w-4 h-4" />
            Connected Accounts
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {accounts.length}
            </span>
          </NavLink>

          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            One-Scan QR
          </NavLink>

          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <CheckCircle2 className="w-4 h-4" />
            Attendance
          </NavLink>

          <NavLink
            to="/timetable"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Calendar className="w-4 h-4" />
            Timetable
          </NavLink>
        </nav>

        {/* Desktop Active Account Indicator */}
        {activeAccount && (
          <div className="mt-auto p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Active Student</p>
            <p className="text-sm font-bold text-white truncate mt-0.5">{activeAccount.studentName}</p>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>{activeAccount.prn}</span>
              <span className="text-emerald-400 font-semibold">{activeAccount.attendancePercentage}%</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              CT
            </div>
            <span className="font-bold text-base tracking-tight">Campus Track</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            DYPIU Juno ERP Connected
          </div>

          {/* Account Selector Dropdown */}
          <div className="flex items-center gap-3 ml-auto">
            {accounts.length > 0 && activeAccount && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-sm transition-all text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span className="font-semibold text-slate-800 max-w-[120px] sm:max-w-[180px] truncate">
                    {activeAccount.studentName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                    Switch Active Account
                  </p>
                  <div className="flex flex-col gap-1 mt-1 max-h-56 overflow-y-auto">
                    {accounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => setActiveAccount(acc)}
                        className={`text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                          acc.id === activeAccount.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{acc.studentName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium ml-1">
                          {acc.attendancePercentage}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          Home
        </NavLink>

        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`
          }
        >
          <Users className="w-5 h-5" />
          Accounts
        </NavLink>

        <NavLink
          to="/scanner"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-all -mt-5 ${
              isActive ? 'text-indigo-600' : 'text-slate-500'
            }`
          }
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <QrCode className="w-6 h-6" />
          </div>
          Scan
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`
          }
        >
          <CheckCircle2 className="w-5 h-5" />
          Attendance
        </NavLink>

        <NavLink
          to="/timetable"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`
          }
        >
          <Calendar className="w-5 h-5" />
          Schedule
        </NavLink>
      </nav>
    </div>
  );
};

