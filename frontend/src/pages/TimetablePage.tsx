import React, { useEffect, useState } from 'react';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import { TimetableSlot } from '../types/index.js';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  RefreshCw,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';

export const TimetablePage: React.FC = () => {
  const { accounts, activeAccount, primaryAccount, setActiveAccount } = useAccounts();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  // Today formatted as YYYY-MM-DD
  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  // Default to primary account if available, otherwise activeAccount
  const currentAccount = activeAccount || primaryAccount;

  const fetchTimetable = (accountId?: string, dateStr?: string) => {
    const idToUse = accountId || currentAccount?.id;
    const dateToUse = dateStr || selectedDate;
    if (!idToUse) return;

    setLoading(true);
    setError(null);
    setRequiresReauth(false);
    api.getTimetable(idToUse, dateToUse)
      .then(data => setTimetable(data))
      .catch(err => {
        setTimetable([]);
        const msg: string = err.message || '';
        setError(msg);
        setRequiresReauth(msg.includes('expired') || msg.includes('re-link') || msg.includes('Session'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // If no activeAccount is selected, prioritize primaryAccount
    if (!activeAccount && primaryAccount) {
      setActiveAccount(primaryAccount);
    }
  }, [primaryAccount, activeAccount, setActiveAccount]);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchTimetable(currentAccount.id, selectedDate);
    }
  }, [currentAccount?.id, selectedDate]);

  // Date manipulation helpers
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayISO());
  };

  const handleSetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Human friendly date string
  const formatDisplayDate = (isoStr: string) => {
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return isoStr;
    } catch {
      return isoStr;
    }
  };

  const isToday = selectedDate === getTodayISO();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Official DYPIU Juno Timetable Sync
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Timetable</h2>
          <p className="text-sm text-slate-500">
            Schedule for{' '}
            <strong className="text-slate-800">{currentAccount?.studentName || 'Student'}</strong>{' '}
            ({currentAccount?.prn || 'PRN'} • {currentAccount?.program || 'Engineering'}).
          </p>
        </div>

        <button
          onClick={() => fetchTimetable()}
          disabled={loading || !currentAccount}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh Timetable
        </button>
      </div>

      {/* Account Selector Pill Tabs with Primary Badge */}
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 ${
                    isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900'
                  }`}>
                    <Star className="w-3 h-3 fill-current" /> Primary ID
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive Calendar Date Picker Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                {formatDisplayDate(selectedDate)}
              </span>
              {isToday && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Juno timetable query date</p>
          </div>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5">
            <button
              onClick={() => shiftDate(-1)}
              title="Previous day"
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleSetToday}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleSetTomorrow}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition-all"
            >
              Tomorrow
            </button>
            <button
              onClick={() => shiftDate(1)}
              title="Next day"
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* HTML5 Native Calendar Date Input */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
            />
          </div>
        </div>
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
            <p className="font-semibold">{requiresReauth ? 'Session Expired — Re-link Required' : 'Failed to Fetch Live Timetable'}</p>
            <p className="text-xs mt-0.5">{error}</p>
            {requiresReauth && (
              <p className="text-xs mt-1 font-medium">Go to <strong>Accounts</strong> → remove this account → re-connect with your Juno credentials.</p>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 mt-3">
            Fetching timetable for {formatDisplayDate(selectedDate)}...
          </p>
          <p className="text-xs text-slate-400 mt-1">Connecting to official DYPIU Juno ERP</p>
        </div>
      )}

      {/* Empty State: No timetable found */}
      {!loading && !error && timetable.length === 0 && currentAccount && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-700 text-sm mt-3 font-semibold">
            No scheduled lectures found for {formatDisplayDate(selectedDate)}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No classes are scheduled on this date (e.g. holiday, weekend, or term break). Use the calendar above to check another date.
          </p>
        </div>
      )}

      {/* Empty State: No account linked */}
      {!loading && !error && timetable.length === 0 && !currentAccount && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-700 text-sm mt-3 font-semibold">No Juno student account linked</p>
          <p className="text-xs text-slate-400 mt-1">Go to <strong>Accounts</strong> and connect your Primary DYPIU Juno student account first.</p>
        </div>
      )}

      {/* Timetable Slots Grid */}
      {!loading && timetable.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timetable.map((slot, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 mb-2">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> {slot.startTime} - {slot.endTime}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                    Lecture {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 leading-snug">{slot.subjectName}</h3>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{slot.facultyName || 'Staff Member'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Classroom: <strong className="text-slate-800">{slot.classroom || 'LH / Lab'}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
