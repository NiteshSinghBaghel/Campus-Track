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
  const { primaryAccount } = useAccounts();
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    try {
      const cached = localStorage.getItem('campustrack_timetable_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Today formatted as YYYY-MM-DD
  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  const fetchTimetable = (dateStr?: string) => {
    if (!primaryAccount?.id) return;
    const dateToUse = dateStr || selectedDate;

    setLoading(true);
    setError(null);
    api.getTimetable(primaryAccount.id, dateToUse)
      .then(data => {
        setTimetable(data);
        try {
          localStorage.setItem('campustrack_timetable_cache', JSON.stringify(data));
        } catch {}
      })
      .catch(err => {
        setTimetable([]);
        setError(err.message || 'Failed to fetch timetable');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (primaryAccount?.id) {
      fetchTimetable(selectedDate);
    }
  }, [primaryAccount?.id, selectedDate]);

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
            <strong className="text-slate-800">{primaryAccount?.studentName || 'Student'}</strong>{' '}
            ({primaryAccount?.prn || 'PRN'} • {primaryAccount?.program || 'MCA'}).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTimetable()}
            disabled={loading || !primaryAccount}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary User Badge Card */}
      {primaryAccount && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {primaryAccount.studentName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">{primaryAccount.studentName}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Primary Account
                </span>
              </div>
              <p className="text-xs text-slate-500">
                PRN: {primaryAccount.prn} • {primaryAccount.program}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            {primaryAccount.attendancePercentage}% Attendance
          </span>
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
            <p className="text-xs text-slate-400">Juno timetable schedule</p>
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
        <div className="p-4 rounded-xl border text-sm flex items-start gap-3 bg-rose-50 border-rose-200 text-rose-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to Fetch Timetable</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 mt-3">
            Loading schedule for {formatDisplayDate(selectedDate)}...
          </p>
          <p className="text-xs text-slate-400 mt-1">Connecting to official DYPIU Juno ERP</p>
        </div>
      )}

      {/* Empty State: No timetable found */}
      {!loading && !error && timetable.length === 0 && primaryAccount && (
        <div className="text-center py-14 bg-white rounded-2xl border border-slate-200 px-4">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-700 text-sm mt-3 font-semibold">
            No classes scheduled for {formatDisplayDate(selectedDate)}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            This could be a Sunday or official institute holiday.
          </p>
        </div>
      )}

      {/* Empty State: No account linked */}
      {!loading && !error && timetable.length === 0 && !primaryAccount && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-700 text-sm mt-3 font-semibold">No Juno student account linked</p>
          <p className="text-xs text-slate-400 mt-1">Please log in to view your timetable.</p>
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
                  <span>Classroom: <strong className="text-slate-800">{slot.classroom || 'LH-201'}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
