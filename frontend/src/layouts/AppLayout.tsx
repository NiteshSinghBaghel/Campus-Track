import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { accounts, activeAccount, primaryAccount, setActiveAccount, logout } = useAccounts();
  const location = useLocation();
  const isScannerPage = location.pathname === '/scanner';
  const [imgError, setImgError] = useState(false);

  if (isScannerPage) {
    return (
      <div className="w-full h-screen bg-black overflow-hidden">
        <Outlet />
      </div>
    );
  }

  const primaryOrActive = primaryAccount || activeAccount;
  const avatarUrl = primaryOrActive ? api.getAccountImageUrl(primaryOrActive.id) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 p-4 shrink-0">
        <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-800 mb-6">
          {/* Top Left Branding: Application Name + Logo */}
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-indigo-500/25">
            <img src="/icons/icon-192.png" alt="Campus Track" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-tight text-white truncate">
              Campus Track
            </h1>
            <p className="text-[11px] text-indigo-400 font-medium truncate">
              DYPIU Juno ERP
            </p>
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

        {/* Desktop Active Account Indicator & Logout Button */}
        <div className="mt-auto space-y-2">
          {activeAccount && (
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active View</p>
              <p className="text-sm font-bold text-white truncate mt-0.5">{activeAccount.studentName}</p>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <span>{activeAccount.prn}</span>
                <span className="text-emerald-400 font-semibold">{activeAccount.attendancePercentage}%</span>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
            title="Log out from Campus Track"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 md:hidden">
            {/* Mobile Top Left: App Logo + Name */}
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shrink-0">
              <img src="/icons/icon-192.png" alt="Campus Track" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight text-slate-900 truncate block">
                Campus Track
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            DYPIU Juno ERP Connected
          </div>

          {/* Right Header: Primary User Avatar & Accounts Menu with Logout */}
          <div className="flex items-center gap-3 ml-auto">
            {primaryOrActive && (
              <div className="relative group">
                <button className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white shadow-sm transition-all text-xs font-medium">
                  {/* Avatar image of primary user from Juno */}
                  {avatarUrl && !imgError ? (
                    <img
                      src={avatarUrl}
                      alt={primaryOrActive.studentName}
                      onError={() => setImgError(true)}
                      className="w-7 h-7 rounded-full object-cover border border-indigo-500 shrink-0 bg-slate-800"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {primaryOrActive.studentName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <span className="font-bold text-slate-800 max-w-[100px] sm:max-w-[150px] truncate text-left">
                    {primaryOrActive.studentName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-180" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1">
                  {/* Primary Profile Header */}
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                    {avatarUrl && !imgError ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {primaryOrActive.studentName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-xs text-slate-900 truncate">
                        {primaryOrActive.studentName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {primaryOrActive.prn} • Primary
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {primaryOrActive.attendancePercentage}% Attendance
                      </span>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out from Campus Track
                    </button>
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

