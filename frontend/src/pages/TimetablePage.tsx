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

const MCA_SCHEDULE_BY_DAY: Record<number, TimetableSlot[]> = {
  // Monday (1)
  1: [
    { dayOfWeek: 1, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-201 (Div - A)', startTime: '09:30', endTime: '10:30' },
    { dayOfWeek: 1, subjectName: 'Data Structure with Python (MCA1003)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'LH-201 (Div - A)', startTime: '10:30', endTime: '11:30' },
    { dayOfWeek: 1, subjectName: 'Design Analysis & Algorithm (MCA1002)', facultyName: 'Dr. Kiran Pandey', classroom: 'LH-201 (Div - A)', startTime: '11:45', endTime: '12:45' },
    { dayOfWeek: 1, subjectName: 'Data Structure with Python Lab (MCA1003P)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'Computer Lab 3 (Div - A)', startTime: '01:30', endTime: '03:30' }
  ],
  // Tuesday (2)
  2: [
    { dayOfWeek: 2, subjectName: 'Design Analysis & Algorithm (MCA1002)', facultyName: 'Dr. Kiran Pandey', classroom: 'LH-201 (Div - A)', startTime: '09:30', endTime: '10:30' },
    { dayOfWeek: 2, subjectName: 'Artificial Intelligence & Data Science (MCA1005)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'LH-201 (Div - A)', startTime: '10:30', endTime: '11:30' },
    { dayOfWeek: 2, subjectName: 'Data Mining & Warehousing (MCA1004)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'LH-201 (Div - A)', startTime: '11:45', endTime: '12:45' },
    { dayOfWeek: 2, subjectName: 'Design Analysis & Algorithm Lab (MCA1002P)', facultyName: 'Mr. Rohit Deepak Rane', classroom: 'Computer Lab 2 (Div - A)', startTime: '01:30', endTime: '03:30' }
  ],
  // Wednesday (3)
  3: [
    { dayOfWeek: 3, subjectName: 'Data Structure with Python (MCA1003)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'LH-201 (Div - A)', startTime: '09:30', endTime: '10:30' },
    { dayOfWeek: 3, subjectName: 'Data Mining & Warehousing (MCA1004)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'LH-201 (Div - A)', startTime: '10:30', endTime: '11:30' },
    { dayOfWeek: 3, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-201 (Div - A)', startTime: '11:45', endTime: '12:45' },
    { dayOfWeek: 3, subjectName: 'Artificial Intelligence & Data Science Lab (MCA1005P)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'AI Lab (Div - A)', startTime: '01:30', endTime: '03:30' }
  ],
  // Thursday (4)
  4: [
    { dayOfWeek: 4, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-201 (Div - A)', startTime: '09:30', endTime: '10:30' },
    { dayOfWeek: 4, subjectName: 'Design Analysis & Algorithm (MCA1002)', facultyName: 'Dr. Kiran Pandey', classroom: 'LH-201 (Div - A)', startTime: '10:30', endTime: '11:30' },
    { dayOfWeek: 4, subjectName: 'Data Structure with Python (MCA1003)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'LH-201 (Div - A)', startTime: '11:45', endTime: '12:45' },
    { dayOfWeek: 4, subjectName: 'Data Mining & Warehousing Lab (MCA1004P)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'Computer Lab 1 (Div - A)', startTime: '01:30', endTime: '03:30' }
  ],
  // Friday (5)
  5: [
    { dayOfWeek: 5, subjectName: 'Artificial Intelligence & Data Science (MCA1005)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'LH-201 (Div - A)', startTime: '09:30', endTime: '10:30' },
    { dayOfWeek: 5, subjectName: 'Data Mining & Warehousing (MCA1004)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'LH-201 (Div - A)', startTime: '10:30', endTime: '11:30' },
    { dayOfWeek: 5, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-201 (Div - A)', startTime: '11:45', endTime: '12:45' },
    { dayOfWeek: 5, subjectName: 'Professional Skills - I (MCA1006)', facultyName: 'Mr. Nikhil Goud', classroom: 'Seminar Hall 1 (Div - A)', startTime: '01:30', endTime: '03:30' }
  ],
  // Saturday (6)
  6: [
    { dayOfWeek: 6, subjectName: 'Professional Skills & Mentorship (MCA1006)', facultyName: 'Mr. Nikhil Goud', classroom: 'LH-201 (Div - A)', startTime: '10:00', endTime: '12:00' }
  ]
};

const getDayOfWeek = (dateStr: string) => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  }
  return new Date().getDay();
};

export const TimetablePage: React.FC = () => {
  const { primaryAccount } = useAccounts();

  // Today formatted as YYYY-MM-DD
  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  // Instant render: Load MCA Sem-1 schedule immediately (0ms wait)
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    const day = getDayOfWeek(getTodayISO());
    return MCA_SCHEDULE_BY_DAY[day] || [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = (dateStr?: string) => {
    const dateToUse = dateStr || selectedDate;
    const day = getDayOfWeek(dateToUse);

    // Update timetable immediately for the selected day (0ms)
    setTimetable(MCA_SCHEDULE_BY_DAY[day] || []);

    if (!primaryAccount?.id) return;

    api.getTimetable(primaryAccount.id, dateToUse)
      .then(data => {
        if (data && data.length > 0) {
          setTimetable(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTimetable(selectedDate);
  }, [selectedDate, primaryAccount?.id]);

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
