import React, { useEffect, useState } from 'react';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import { AttendanceSummary } from '../types/index.js';
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Filter,
  RefreshCw,
  Sparkles,
  Star,
  Layers,
  GraduationCap,
  Calendar,
  Check,
  AlertCircle
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { accounts, activeAccount, primaryAccount, setActiveAccount, syncAccount } = useAccounts();
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(() => {
    try {
      const cached = localStorage.getItem('campustrack_attendance_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'WARNING'>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  const currentAccount = activeAccount || primaryAccount;

  const fetchAttendance = (accountId?: string, termId?: string) => {
    const idToUse = accountId || currentAccount?.id;
    if (!idToUse) return;

    setLoading(true);
    setError(null);
    setRequiresReauth(false);
    api.getAttendance(idToUse, termId || selectedSemester)
      .then(data => {
        setAttendance(data);
        try {
          localStorage.setItem('campustrack_attendance_cache', JSON.stringify(data));
        } catch {}
      })
      .catch(err => {
        setAttendance(null);
        const msg: string = err.message || '';
        setError(msg);
        setRequiresReauth(msg.includes('expired') || msg.includes('re-link') || msg.includes('Session'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!activeAccount && primaryAccount) {
      setActiveAccount(primaryAccount);
    }
  }, [primaryAccount, activeAccount, setActiveAccount]);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchAttendance(currentAccount.id, selectedSemester);
    }
  }, [currentAccount?.id, selectedSemester]);

  const handleSync = async () => {
    if (!currentAccount) return;
    try {
      setSyncing(true);
      setError(null);
      setRequiresReauth(false);
      await syncAccount(currentAccount.id);
      await fetchAttendance(currentAccount.id, selectedSemester);
    } catch (err) {
      const msg: string = (err as Error).message || '';
      setError(msg);
      setRequiresReauth(msg.includes('expired') || msg.includes('re-link') || msg.includes('Session'));
    } finally {
      setSyncing(false);
    }
  };

  // Filter subjects by search and status criteria
  const filteredSubjects = (attendance?.subjects || []).filter(s => {
    const matchesSearch =
      s.subjectName.toLowerCase().includes(filterText.toLowerCase()) ||
      s.subjectCode.toLowerCase().includes(filterText.toLowerCase()) ||
      (s.facultyName && s.facultyName.toLowerCase().includes(filterText.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'SAFE') return s.percentage >= 75;
    if (statusFilter === 'WARNING') return s.percentage < 75;
    return true;
  });

  // Calculate lecture shortfall/buffer for 75% requirement
  const getAttendanceStatusAdvice = (present: number, total: number, percentage: number) => {
    if (total === 0) return { text: 'No lectures delivered yet', isSafe: true };
    if (percentage >= 75) {
      // How many more classes can they miss while staying >= 75%?
      // present / (total + x) >= 0.75  =>  present / 0.75 - total >= x
      const canMiss = Math.floor(present / 0.75 - total);
      return {
        text: canMiss > 0 ? `Safe • Can miss ${canMiss} more lecture${canMiss > 1 ? 's' : ''}` : 'Safe • On borderline (75%)',
        isSafe: true
      };
    } else {
      // How many consecutive classes needed to reach 75%?
      // (present + x) / (total + x) >= 0.75  =>  x >= (0.75 * total - present) / 0.25
      const needed = Math.ceil((0.75 * total - present) / 0.25);
      return {
        text: `Warning • Attend ${needed > 0 ? needed : 1} lecture${needed > 1 ? 's' : ''} to reach 75%`,
        isSafe: false
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Live DYPIU Juno Attendance Record
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance Dashboard</h2>
          <p className="text-sm text-slate-500">
            Real-time subject-wise records for{' '}
            <strong className="text-slate-800">{currentAccount?.studentName || 'Student'}</strong>{' '}
            ({currentAccount?.prn || 'PRN'} • {currentAccount?.program || 'Engineering'}).
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || !currentAccount}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-600' : ''}`} />
          {syncing ? 'Syncing Juno...' : 'Sync with Juno ERP'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          requiresReauth
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{requiresReauth ? 'Session Expired — Re-link Required' : 'Failed to Fetch Live Attendance'}</p>
            <p className="text-xs mt-0.5">{error}</p>
            {requiresReauth && (
              <p className="text-xs mt-1 font-medium">Go to <strong>Accounts</strong> → remove this account → re-connect with your Juno credentials.</p>
            )}
          </div>
        </div>
      )}

      {/* Account Selector Pill Tabs */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {accounts.map(acc => {
            const isSelected = acc.id === currentAccount?.id;
            return (
              <button
                key={acc.id}
                onClick={() => setActiveAccount(acc)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{acc.studentName}</span>
                {acc.isPrimary && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold flex items-center gap-1 ${
                    isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900'
                  }`}>
                    <Star className="w-3 h-3 fill-current" /> Primary
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {acc.attendancePercentage}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* High-Level Attendance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Overall Percentage</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {attendance?.overallPercentage ?? currentAccount?.attendancePercentage ?? 0}%
          </p>
          <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
            (attendance?.overallPercentage ?? 0) >= 75 ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {(attendance?.overallPercentage ?? 0) >= 75 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Above 75% Criteria
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" /> Shortfall Warning (&lt;75%)
              </>
            )}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Lectures</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{attendance?.totalClasses ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">Delivered in current session</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Present Lectures</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{attendance?.presentClasses ?? 0}</p>
          <p className="text-xs text-emerald-600/80 font-medium mt-2">Verified presence</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Absent Lectures</p>
          <p className="text-3xl font-extrabold text-rose-600 mt-2">{attendance?.absentClasses ?? 0}</p>
          <p className="text-xs text-rose-600/80 font-medium mt-2">Missed sessions</p>
        </div>
      </div>

      {/* Semester Selection Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Academic Semester</h3>
            <p className="text-[11px] text-slate-500">
              Enrolled Term: <strong className="text-indigo-600">{currentAccount?.semester || 'SEM - 1'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: '1', label: 'SEM 1 (Active)' },
            { id: '2', label: 'SEM 2' },
            { id: '3', label: 'SEM 3' },
            { id: '4', label: 'SEM 4' },
            { id: 'All', label: 'All Semesters' }
          ].map(sem => {
            const isSelected = selectedSemester === sem.id;
            return (
              <button
                key={sem.id}
                type="button"
                onClick={() => setSelectedSemester(sem.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {sem.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject-Wise Course Attendance Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Semester {selectedSemester === 'All' ? 'All' : selectedSemester} — Subject-Wise Attendance Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual course progress, delivered lectures, and minimum 75% attendance criteria status.
            </p>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({attendance?.subjects?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SAFE')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'SAFE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                Safe ≥75%
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('WARNING')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'WARNING' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                Shortfall &lt;75%
              </button>
            </div>

            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subject or faculty..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 mt-2.5">
              Loading Semester {selectedSemester} subject records from Juno ERP...
            </p>
          </div>
        )}

        {/* Subjects List */}
        {!loading && filteredSubjects.length > 0 && (
          <div className="divide-y divide-slate-100">
            {filteredSubjects.map((sub, i) => {
              const advice = getAttendanceStatusAdvice(sub.presentClasses, sub.totalClasses, sub.percentage);
              const isSafe = sub.percentage >= 75;

              return (
                <div key={i} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 rounded-xl px-2 transition-all">
                  {/* Left: Subject Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {sub.subjectCode}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{sub.subjectName}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sub.percentage}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                      <span>Faculty: <strong className="text-slate-700">{sub.facultyName || 'Staff Member'}</strong></span>
                      <span>•</span>
                      <span>Delivered: <strong className="text-slate-700">{sub.totalClasses}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">Attended: <strong>{sub.presentClasses}</strong></span>
                      <span>•</span>
                      <span className="text-rose-700 font-medium">Missed: <strong>{sub.absentClasses}</strong></span>
                    </div>

                    <p className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1.5 ${
                      advice.isSafe ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${advice.isSafe ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {advice.text}
                    </p>
                  </div>

                  {/* Right: Visual Progress Bar */}
                  <div className="shrink-0 md:w-64 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Attendance</span>
                      <span className={isSafe ? 'text-emerald-600' : 'text-amber-600'}>
                        {sub.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isSafe ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Min 75% Target</span>
                      <span>{sub.presentClasses} / {sub.totalClasses} sessions</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Search / No Subjects State */}
        {!loading && filteredSubjects.length === 0 && (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 mt-2">No subjects found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {filterText ? `No subject matches "${filterText}". Try a different search term.` : 'Click "Sync with Juno ERP" above to refresh.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
