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

const MCA_SCHEDULE_DIV_A: Record<number, TimetableSlot[]> = {
  // Monday (1)
  1: [
    { dayOfWeek: 1, subjectName: 'Statistical Mathematics', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'Classroom', startTime: '12:40 PM', endTime: '01:30 PM' },
    { dayOfWeek: 1, subjectName: 'Artificial Intelligence & Data Science', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'Classroom', startTime: '04:00 PM', endTime: '04:50 PM' },
    { dayOfWeek: 1, subjectName: 'Data Mining & Warehousing', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'Classroom', startTime: '04:50 PM', endTime: '05:40 PM' },
    { dayOfWeek: 1, subjectName: 'Artificial Intelligence & Data Science', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'Classroom 313', startTime: '05:40 PM', endTime: '06:30 PM' }
  ],
  // Tuesday (2)
  2: [
    { dayOfWeek: 2, subjectName: 'Design Analysis & Algorithm', facultyName: 'Dr. Kiran Pandey', classroom: 'Classroom', startTime: '12:40 PM', endTime: '01:30 PM' },
    { dayOfWeek: 2, subjectName: 'Statistical Mathematics', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'Classroom', startTime: '04:00 PM', endTime: '04:50 PM' },
    { dayOfWeek: 2, subjectName: 'Data Structure with Python', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'Classroom', startTime: '04:50 PM', endTime: '05:40 PM' },
    { dayOfWeek: 2, subjectName: 'Design Analysis & Algorithm Lab', facultyName: 'Dr. Kiran Pandey', classroom: 'Computer Lab 2', startTime: '05:40 PM', endTime: '06:30 PM' }
  ],
  // Wednesday (3)
  3: [
    { dayOfWeek: 3, subjectName: 'Data Structure with Python', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'Classroom', startTime: '12:40 PM', endTime: '01:30 PM' },
    { dayOfWeek: 3, subjectName: 'Design Analysis & Algorithm', facultyName: 'Dr. Kiran Pandey', classroom: 'Classroom', startTime: '04:00 PM', endTime: '04:50 PM' },
    { dayOfWeek: 3, subjectName: 'Data Mining & Warehousing', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'Classroom', startTime: '04:50 PM', endTime: '05:40 PM' },
    { dayOfWeek: 3, subjectName: 'Artificial Intelligence & Data Science Lab', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'AI Lab 313', startTime: '05:40 PM', endTime: '06:30 PM' }
  ],
  // Thursday (4)
  4: [
    { dayOfWeek: 4, subjectName: 'Data Mining & Warehousing', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'Classroom', startTime: '12:40 PM', endTime: '01:30 PM' },
    { dayOfWeek: 4, subjectName: 'Statistical Mathematics', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'Classroom', startTime: '04:00 PM', endTime: '04:50 PM' },
    { dayOfWeek: 4, subjectName: 'Artificial Intelligence & Data Science', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'Classroom', startTime: '04:50 PM', endTime: '05:40 PM' },
    { dayOfWeek: 4, subjectName: 'Data Structure with Python Lab', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'Computer Lab 3', startTime: '05:40 PM', endTime: '06:30 PM' }
  ],
  // Friday (5)
  5: [
    { dayOfWeek: 5, subjectName: 'Statistical Mathematics', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'Classroom', startTime: '12:40 PM', endTime: '01:30 PM' },
    { dayOfWeek: 5, subjectName: 'Design Analysis & Algorithm', facultyName: 'Dr. Kiran Pandey', classroom: 'Classroom', startTime: '04:00 PM', endTime: '04:50 PM' },
    { dayOfWeek: 5, subjectName: 'Professional Skills - I', facultyName: 'Mr. Nikhil Goud', classroom: 'Classroom', startTime: '04:50 PM', endTime: '05:40 PM' },
    { dayOfWeek: 5, subjectName: 'Data Mining & Warehousing Lab', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'Computer Lab 1', startTime: '05:40 PM', endTime: '06:30 PM' }
  ],
  // Saturday (6)
  6: [
    { dayOfWeek: 6, subjectName: 'Professional Skills & Mentorship', facultyName: 'Mr. Nikhil Goud', classroom: 'Classroom', startTime: '10:00 AM', endTime: '12:00 PM' }
  ]
};

const MCA_SCHEDULE_DIV_B: Record<number, TimetableSlot[]> = {
  1: [
    { dayOfWeek: 1, subjectName: 'Design Analysis & Algorithm (MCA1002)', facultyName: 'Dr. Kiran Pandey', classroom: 'LH-202 (Div - B)', startTime: '09:30 AM', endTime: '10:30 AM' },
    { dayOfWeek: 1, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-202 (Div - B)', startTime: '10:30 AM', endTime: '11:30 AM' },
    { dayOfWeek: 1, subjectName: 'Data Mining & Warehousing (MCA1004)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'LH-202 (Div - B)', startTime: '11:45 AM', endTime: '12:45 PM' },
    { dayOfWeek: 1, subjectName: 'Data Mining & Warehousing Lab (MCA1004P)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'Computer Lab 2 (Div - B)', startTime: '01:30 PM', endTime: '03:30 PM' }
  ],
  2: [
    { dayOfWeek: 2, subjectName: 'Data Structure with Python (MCA1003)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'LH-202 (Div - B)', startTime: '09:30 AM', endTime: '10:30 AM' },
    { dayOfWeek: 2, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-202 (Div - B)', startTime: '10:30 AM', endTime: '11:30 AM' },
    { dayOfWeek: 2, subjectName: 'Artificial Intelligence & Data Science (MCA1005)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'LH-202 (Div - B)', startTime: '11:45 AM', endTime: '12:45 PM' },
    { dayOfWeek: 2, subjectName: 'Data Structure with Python Lab (MCA1003P)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'Computer Lab 1 (Div - B)', startTime: '01:30 PM', endTime: '03:30 PM' }
  ],
  3: [
    { dayOfWeek: 3, subjectName: 'Artificial Intelligence & Data Science (MCA1005)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'LH-202 (Div - B)', startTime: '09:30 AM', endTime: '10:30 AM' },
    { dayOfWeek: 3, subjectName: 'Design Analysis & Algorithm (MCA1002)', facultyName: 'Dr. Kiran Pandey', classroom: 'LH-202 (Div - B)', startTime: '10:30 AM', endTime: '11:30 AM' },
    { dayOfWeek: 3, subjectName: 'Data Mining & Warehousing (MCA1004)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'LH-202 (Div - B)', startTime: '11:45 AM', endTime: '12:45 PM' },
    { dayOfWeek: 3, subjectName: 'Design Analysis & Algorithm Lab (MCA1002P)', facultyName: 'Mr. Rohit Deepak Rane', classroom: 'Computer Lab 3 (Div - B)', startTime: '01:30 PM', endTime: '03:30 PM' }
  ],
  4: [
    { dayOfWeek: 4, subjectName: 'Data Mining & Warehousing (MCA1004)', facultyName: 'Mrs. Mayuri Ajinkya Khade', classroom: 'LH-202 (Div - B)', startTime: '09:30 AM', endTime: '10:30 AM' },
    { dayOfWeek: 4, subjectName: 'Data Structure with Python (MCA1003)', facultyName: 'Mr. Abhijeet Nitin Jadhav', classroom: 'LH-202 (Div - B)', startTime: '10:30 AM', endTime: '11:30 AM' },
    { dayOfWeek: 4, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-202 (Div - B)', startTime: '11:45 AM', endTime: '12:45 PM' },
    { dayOfWeek: 4, subjectName: 'Artificial Intelligence & Data Science Lab (MCA1005P)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'AI Lab (Div - B)', startTime: '01:30 PM', endTime: '03:30 PM' }
  ],
  5: [
    { dayOfWeek: 5, subjectName: 'Statistical Mathematics (MCA1001)', facultyName: 'Ms. Shraddha S. Ghatol', classroom: 'LH-202 (Div - B)', startTime: '09:30 AM', endTime: '10:30 AM' },
    { dayOfWeek: 5, subjectName: 'Design Analysis & Algorithm (MCA1002)', facultyName: 'Dr. Kiran Pandey', classroom: 'LH-202 (Div - B)', startTime: '10:30 AM', endTime: '11:30 AM' },
    { dayOfWeek: 5, subjectName: 'Artificial Intelligence & Data Science (MCA1005)', facultyName: 'Mr. Anurag Madhav Gaikwad', classroom: 'LH-202 (Div - B)', startTime: '11:45 AM', endTime: '12:45 PM' },
    { dayOfWeek: 5, subjectName: 'Professional Skills - I (MCA1006)', facultyName: 'Mr. Nikhil Goud', classroom: 'Seminar Hall 2 (Div - B)', startTime: '01:30 PM', endTime: '03:30 PM' }
  ],
  6: [
    { dayOfWeek: 6, subjectName: 'Professional Skills & Mentorship (MCA1006)', facultyName: 'Mr. Nikhil Goud', classroom: 'LH-202 (Div - B)', startTime: '10:00 AM', endTime: '12:00 PM' }
  ]
};

const getScheduleForAccount = (division: string, day: number): TimetableSlot[] => {
  const isB = division.toUpperCase().includes('B');
  const map = isB ? MCA_SCHEDULE_DIV_B : MCA_SCHEDULE_DIV_A;
  return map[day] || [];
};

const getDayOfWeek = (dateStr: string) => {
  if (dateStr && dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day).getDay();
    }
  }
  return new Date().getDay();
};

export const TimetablePage: React.FC = () => {
  const { accounts, activeAccount, primaryAccount, setActiveAccount } = useAccounts();
  const currentAccount = activeAccount || primaryAccount;
  const currentDiv = currentAccount?.semester || 'A';

  // Today formatted as YYYY-MM-DD
  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  // Instant render: Load schedule mapped to student's division immediately (0ms wait)
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    const day = getDayOfWeek(getTodayISO());
    return getScheduleForAccount(currentDiv, day);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = (dateStr?: string) => {
    const dateToUse = dateStr || selectedDate;
    const day = getDayOfWeek(dateToUse);

    // Update timetable immediately for the selected day according to student allotment (0ms)
    setTimetable(getScheduleForAccount(currentDiv, day));

    if (!currentAccount?.id) return;

    api.getTimetable(currentAccount.id, dateToUse)
      .then(data => {
        if (data && data.length > 0) {
          setTimetable(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTimetable(selectedDate);
  }, [selectedDate, currentAccount?.id, currentDiv]);

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

      {/* Account Selector Pill for Multi-Account support */}
      {accounts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {accounts.map(acc => {
            const isSelected = acc.id === currentAccount?.id;
            return (
              <button
                key={acc.id}
                onClick={() => setActiveAccount(acc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{acc.studentName}</span>
                {acc.isPrimary && <Star className="w-3 h-3 text-amber-400 fill-current" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Student Information Card */}
      {currentAccount && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {currentAccount.studentName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">{currentAccount.studentName}</p>
                {currentAccount.isPrimary ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Primary
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    Connected
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                  {currentDiv.includes('B') ? 'DIV - B' : 'DIV - A'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                PRN: {currentAccount.prn} • {currentAccount.program}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            {currentAccount.attendancePercentage}% Attendance
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

      {/* Timetable Vertical Timeline / Cards View (Matching Juno App Format) */}
      {!loading && timetable.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            {formatDisplayDate(selectedDate)} • {timetable.length} classes
          </p>

          <div className="relative pl-2 sm:pl-4 space-y-4 before:absolute before:top-4 before:bottom-4 before:left-[118px] sm:before:left-[126px] before:w-0.5 before:bg-slate-200">
            {timetable.map((slot, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4 group">
                {/* Time Indicator */}
                <div className="w-24 sm:w-26 shrink-0 text-right pt-2.5">
                  <div className="text-sm font-extrabold text-slate-900 leading-tight">
                    {slot.startTime}
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">
                    {slot.endTime}
                  </div>
                </div>

                {/* Timeline node */}
                <div className="relative z-10 mt-3.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white shrink-0 shadow-sm" />

                {/* Lecture Detail Card */}
                <div className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug tracking-tight">
                    {slot.subjectName}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{slot.facultyName || 'Staff Member'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-500">
                        {slot.classroom || 'Classroom'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
