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
  CalendarDays,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  RotateCcw
} from 'lucide-react';

const CUSTOM_TIMETABLE_KEY = 'campus_track_custom_timetable';

export const TimetablePage: React.FC = () => {
  const { accounts, activeAccount, primaryAccount, setActiveAccount } = useAccounts();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDay, setEditingDay] = useState<number>(1); // 1 = Mon, 2 = Tue, ...
  const [customScheduleMap, setCustomScheduleMap] = useState<Record<number, TimetableSlot[]>>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TIMETABLE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

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

    // Check if user has defined a custom schedule override for this weekday
    const targetDay = new Date(dateToUse).getDay() || 1;
    if (customScheduleMap[targetDay] && customScheduleMap[targetDay].length > 0) {
      setTimetable(customScheduleMap[targetDay]);
      setLoading(false);
      return;
    }

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
  }, [currentAccount?.id, selectedDate, customScheduleMap]);

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

  // Custom schedule editor handlers
  const handleSlotChange = (day: number, index: number, field: keyof TimetableSlot, value: any) => {
    setCustomScheduleMap(prev => {
      const currentList = prev[day] ? [...prev[day]] : [...(timetable || [])];
      if (currentList[index]) {
        currentList[index] = { ...currentList[index], [field]: value };
      }
      return { ...prev, [day]: currentList };
    });
  };

  const handleAddSlot = (day: number) => {
    setCustomScheduleMap(prev => {
      const currentList = prev[day] ? [...prev[day]] : [...(timetable || [])];
      const newSlot: TimetableSlot = {
        dayOfWeek: day,
        subjectName: 'Data Structure with Python (MCA1003)',
        facultyName: 'Mr. Abhijeet Nitin Jadhav',
        classroom: 'LH-101',
        startTime: '10:00',
        endTime: '11:00'
      };
      return { ...prev, [day]: [...currentList, newSlot] };
    });
  };

  const handleDeleteSlot = (day: number, index: number) => {
    setCustomScheduleMap(prev => {
      const currentList = prev[day] ? [...prev[day]] : [...(timetable || [])];
      currentList.splice(index, 1);
      return { ...prev, [day]: currentList };
    });
  };

  const handleSaveCustomSchedule = () => {
    try {
      localStorage.setItem(CUSTOM_TIMETABLE_KEY, JSON.stringify(customScheduleMap));
    } catch {}
    setShowEditModal(false);
    fetchTimetable(currentAccount?.id, selectedDate);
  };

  const handleResetToERPDefault = () => {
    try {
      localStorage.removeItem(CUSTOM_TIMETABLE_KEY);
    } catch {}
    setCustomScheduleMap({});
    setShowEditModal(false);
    fetchTimetable(currentAccount?.id, selectedDate);
  };

  const daysLabels = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' }
  ];

  const currentDaySlots = customScheduleMap[editingDay] || timetable;

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
            ({currentAccount?.prn || 'PRN'} • {currentAccount?.program || 'MCA'}).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              const curDay = new Date(selectedDate).getDay() || 1;
              setEditingDay(curDay);
              setShowEditModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Adjust Timing & Schedule
          </button>

          <button
            onClick={() => fetchTimetable()}
            disabled={loading || !currentAccount}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
        </div>
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
        <div className="text-center py-14 bg-white rounded-2xl border border-slate-200 px-4">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-700 text-sm mt-3 font-semibold">
            No classes scheduled for {formatDisplayDate(selectedDate)}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            This could be a holiday, weekend, or Juno ERP hasn't published the timetable block yet. Try a weekday or use <strong className="text-slate-600">Adjust Timing &amp; Schedule</strong> to add slots manually.
          </p>
          <p className="text-[11px] text-slate-300 mt-3">
            Enrolled subjects: MCA1001 · MCA1002 · MCA1003 · MCA1004 · MCA1005 · MCA1006
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

      {/* Adjust Timing & Schedule Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Customize Lecture Timings & Schedule</h3>
                  <p className="text-xs text-slate-500">Edit lecture times, subjects, and classrooms to match your exact class routine.</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 overflow-x-auto">
              {daysLabels.map(d => (
                <button
                  key={d.num}
                  onClick={() => setEditingDay(d.num)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
                    editingDay === d.num
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Slots Editor List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh]">
              {(customScheduleMap[editingDay] || timetable).map((slot, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      Slot #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteSlot(editingDay, idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-all"
                      title="Remove Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Start Time */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={e => handleSlotChange(editingDay, idx, 'startTime', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={e => handleSlotChange(editingDay, idx, 'endTime', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      />
                    </div>

                    {/* Classroom */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Room / Lab</label>
                      <input
                        type="text"
                        value={slot.classroom}
                        placeholder="LH-101"
                        onChange={e => handleSlotChange(editingDay, idx, 'classroom', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      />
                    </div>

                    {/* Faculty */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Professor</label>
                      <input
                        type="text"
                        value={slot.facultyName}
                        placeholder="Faculty"
                        onChange={e => handleSlotChange(editingDay, idx, 'facultyName', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  {/* Subject Name */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Subject / Lecture Title</label>
                    <input
                      type="text"
                      value={slot.subjectName}
                      placeholder="Subject Name"
                      onChange={e => handleSlotChange(editingDay, idx, 'subjectName', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => handleAddSlot(editingDay)}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-indigo-50/30"
              >
                <Plus className="w-4 h-4" />
                Add Lecture Slot
              </button>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={handleResetToERPDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to ERP Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomSchedule}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Save & Apply Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
