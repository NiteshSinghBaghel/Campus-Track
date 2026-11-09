import React, { useEffect, useState } from 'react';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import { AttendanceSummary, TimetableSlot } from '../types/index.js';
import { Link } from 'react-router-dom';
import {
  Users,
  QrCode,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { accounts, activeAccount, primaryAccount } = useAccounts();
  const currentAccount = activeAccount || primaryAccount;

  const [attendance, setAttendance] = useState<AttendanceSummary | null>(() => {
    try {
      if (currentAccount?.id) {
        const cachedAtt = localStorage.getItem(`att_cache_${currentAccount.id}`);
        if (cachedAtt) {
          const parsed = JSON.parse(cachedAtt);
          if (parsed?.data) return parsed.data;
        }
        const cachedPageAtt = localStorage.getItem(`campustrack_att_${currentAccount.id}`);
        if (cachedPageAtt) return JSON.parse(cachedPageAtt);
      }
      const cached = localStorage.getItem('campustrack_attendance_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    try {
      if (currentAccount?.id) {
        const cachedTt = localStorage.getItem(`tt_cache_${currentAccount.id}`);
        if (cachedTt) {
          const parsed = JSON.parse(cachedTt);
          if (parsed?.data) return parsed.data;
        }
      }
      const cached = localStorage.getItem('campustrack_timetable_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentAccount) return;

    // 1. Load from localStorage cache INSTANTLY (no wait)
    try {
      const cachedAtt = localStorage.getItem(`att_cache_${currentAccount.id}`);
      if (cachedAtt) {
        const { data } = JSON.parse(cachedAtt);
        if (data) setAttendance(data);
      } else {
        const cachedPageAtt = localStorage.getItem(`campustrack_att_${currentAccount.id}`);
        if (cachedPageAtt) setAttendance(JSON.parse(cachedPageAtt));
      }
      const cachedTt = localStorage.getItem(`tt_cache_${currentAccount.id}`);
      if (cachedTt) {
        const { data } = JSON.parse(cachedTt);
        if (data) setTimetable(data);
      }
    } catch {}

    // 2. Fetch fresh data in background (non-blocking)
    Promise.all([
      api.getAttendance(currentAccount.id).catch(() => null),
      api.getTimetable(currentAccount.id).catch(() => [])
    ]).then(([attData, ttData]) => {
      if (attData) {
        setAttendance(attData);
        try { 
          localStorage.setItem(`att_cache_${currentAccount.id}`, JSON.stringify({ data: attData, ts: Date.now() })); 
          localStorage.setItem(`campustrack_att_${currentAccount.id}`, JSON.stringify(attData));
        } catch {}
      }
      if (ttData && ttData.length > 0) {
        setTimetable(ttData);
        try { localStorage.setItem(`tt_cache_${currentAccount.id}`, JSON.stringify({ data: ttData, ts: Date.now() })); } catch {}
      }
      setLoading(false);
    });
  }, [currentAccount?.id]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              D. Y. Patil International University
            </div>
            {currentAccount?.isPrimary && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                ⭐ Primary Account
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentAccount?.studentName?.split(' ')[0] || 'Student'}!
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Multi-account companion platform connected to official DYPIU Juno ERP. Manage your attendance, scan faculty QR sessions, and coordinate group presence.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/scanner"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all"
            >
              <QrCode className="w-4 h-4" />
              One-Scan Attendance
            </Link>
            <Link
              to="/accounts"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
            >
              <Users className="w-4 h-4" />
              Manage {accounts.length} Accounts
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {attendance?.overallPercentage ?? currentAccount?.attendancePercentage ?? 0}%
              </span>
              <span className="text-xs font-medium text-emerald-600">Juno Live</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${attendance?.overallPercentage ?? currentAccount?.attendancePercentage ?? 0}%` }}
              ></div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {attendance ? `${attendance.presentClasses} of ${attendance.totalClasses} lectures attended` : (currentAccount?.attendancePercentage ? `${currentAccount.attendancePercentage}% verified presence` : 'Loading latest records...')}
          </p>
        </div>

        {/* Connected Accounts Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connected Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{accounts.length}</span>
            <span className="text-xs font-medium text-slate-500 ml-2">Students</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-3">
            <Link to="/accounts" className="flex items-center gap-1 hover:underline">
              View all connected friends <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Next Class Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next Lecture</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-slate-900 truncate">
              {timetable[0]?.subjectName || 'No scheduled lecture'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {timetable[0] ? `${timetable[0].startTime} - ${timetable[0].endTime} (${timetable[0].classroom})` : 'Enjoy your free time'}
            </p>
          </div>
          <div className="text-xs text-slate-400 mt-3 truncate">
            {timetable[0]?.facultyName || 'DYPIU Faculty'}
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ERP Status</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-slate-900">DYPIU Online</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Direct Spring Security connection</p>
          </div>
          <p className="text-xs text-slate-400 mt-3 truncate">https://erp.dypiu.ac.in</p>
        </div>
      </div>

      {/* Two Column Layout: Connected Accounts List & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Accounts Snapshot (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Connected Student Accounts</h3>
              <p className="text-xs text-slate-500">Accounts eligible for one-scan group attendance</p>
            </div>
            <Link
              to="/accounts"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {accounts.map(account => (
              <div key={account.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-800 flex items-center justify-center relative">
                    <img
                      src={api.getAccountImageUrl(account.id)}
                      alt={account.studentName}
                      className="w-full h-full object-cover z-10"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="font-bold text-white text-xs absolute z-0">
                      {account.studentName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900 truncate">{account.studentName}</p>
                      {account.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold">
                          Primary
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                        {account.semester?.toUpperCase().includes('B') ? 'Div B' : 'Div A'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{account.prn} • {account.program}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 w-12 text-right">
                    {account.attendancePercentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Preview (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">Today's Lectures</h3>
            <Link to="/timetable" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Timetable
            </Link>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            {timetable.slice(0, 3).map((slot, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-slate-900 truncate">{slot.subjectName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{slot.startTime} - {slot.endTime} • {slot.classroom}</p>
                  <p className="text-[11px] text-indigo-600 font-medium truncate mt-0.5">{slot.facultyName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

