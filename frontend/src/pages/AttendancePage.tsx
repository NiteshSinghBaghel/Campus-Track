import React, { useState, useEffect } from 'react';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import { AttendanceSummary } from '../types/index.js';
import { ChevronDown, RefreshCw, Star, AlertTriangle } from 'lucide-react';

const DEFAULT_ATTENDANCE: AttendanceSummary = {
  overallPercentage: 65,
  totalClasses: 161,
  presentClasses: 104,
  absentClasses: 57,
  lastSyncedAt: new Date().toISOString(),
  subjects: [
    {
      subjectCode: 'MCA1005',
      subjectName: 'Artificial Intelligence & Data Science',
      facultyName: 'MR.ANURAG MADHAV GAIKWAD',
      totalClasses: 25,
      presentClasses: 23,
      absentClasses: 2,
      percentage: 92
    },
    {
      subjectCode: 'MCA1005P',
      subjectName: 'Artificial Intelligence & Data Science',
      facultyName: 'MR.ANURAG MADHAV GAIKWAD',
      totalClasses: 10,
      presentClasses: 0,
      absentClasses: 10,
      percentage: 0
    },
    {
      subjectCode: 'MCA1004',
      subjectName: 'Data Mining & Warehousing',
      facultyName: 'MRS.MAYURI AJINKYA KHADE',
      totalClasses: 26,
      presentClasses: 16,
      absentClasses: 10,
      percentage: 62
    },
    {
      subjectCode: 'MCA1004P',
      subjectName: 'Data Mining & Warehousing (Lab)',
      facultyName: 'MRS.MAYURI AJINKYA KHADE',
      totalClasses: 12,
      presentClasses: 8,
      absentClasses: 4,
      percentage: 67
    },
    {
      subjectCode: 'MCA1001',
      subjectName: 'Statistical Mathematics',
      facultyName: 'MS.SHRADDHA S. GHATOL',
      totalClasses: 25,
      presentClasses: 17,
      absentClasses: 8,
      percentage: 68
    },
    {
      subjectCode: 'MCA1002',
      subjectName: 'Design Analysis & Algorithm',
      facultyName: 'DR.KIRAN PANDEY',
      totalClasses: 28,
      presentClasses: 20,
      absentClasses: 8,
      percentage: 71
    },
    {
      subjectCode: 'MCA1002P',
      subjectName: 'Design Analysis & Algorithm (Lab)',
      facultyName: 'MR.ROHIT DEEPAK RANE',
      totalClasses: 10,
      presentClasses: 5,
      absentClasses: 5,
      percentage: 50
    },
    {
      subjectCode: 'MCA1003',
      subjectName: 'Data Structure with Python',
      facultyName: 'MR.ABHIJEET NITIN JADHAV',
      totalClasses: 25,
      presentClasses: 16,
      absentClasses: 9,
      percentage: 64
    },
    {
      subjectCode: 'MCA1003P',
      subjectName: 'Data Structure with Python (Lab)',
      facultyName: 'MR.ABHIJEET NITIN JADHAV',
      totalClasses: 10,
      presentClasses: 6,
      absentClasses: 4,
      percentage: 60
    },
    {
      subjectCode: 'MCA1006',
      subjectName: 'Professional Skills - I',
      facultyName: 'MR.NIKHIL GOUD',
      totalClasses: 10,
      presentClasses: 8,
      absentClasses: 2,
      percentage: 80
    }
  ]
};

export const AttendancePage: React.FC = () => {
  const { primaryAccount } = useAccounts();
  const currentAccount = primaryAccount;

  const [activeTab, setActiveTab] = useState<'subjects' | 'analytics'>('subjects');
  const [showSemDropdown, setShowSemDropdown] = useState(false);
  const [selectedSem, setSelectedSem] = useState('SEM -1');
  const [loading, setLoading] = useState(false);

  // Per-account attendance: load from per-account localStorage cache for primary account
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(() => {
    if (!currentAccount?.id) return null;
    try {
      const cached = localStorage.getItem(`campustrack_att_${currentAccount.id}_${selectedSem}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      }
    } catch {}
    return null;
  });

  // When selectedSem changes, fetch attendance for that semester
  useEffect(() => {
    if (!currentAccount?.id) return;

    // Check if the student's actual current semester matches the selected semester
    const studentSem = currentAccount.semester?.toUpperCase() || 'SEM -1';
    const isCurrentSem = selectedSem === 'SEM -1' || studentSem.includes(selectedSem.replace(/[^0-9]/g, ''));

    const cacheKey = `campustrack_att_${currentAccount.id}_${selectedSem}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setAttendance(JSON.parse(cached));
      } catch {}
    } else if (!isCurrentSem) {
      // Semester not active for this student
      setAttendance({
        overallPercentage: 0,
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        subjects: [],
        lastSyncedAt: new Date().toISOString()
      });
      return;
    }

    const termNum = selectedSem.replace(/[^0-9]/g, '') || '1';
    setLoading(true);

    api.getAttendance(currentAccount.id, termNum)
      .then(data => {
        if (data) {
          setAttendance(data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {}
        }
      })
      .catch(() => {
        if (!isCurrentSem) {
          setAttendance({
            overallPercentage: 0,
            totalClasses: 0,
            presentClasses: 0,
            absentClasses: 0,
            subjects: [],
            lastSyncedAt: new Date().toISOString()
          });
        }
      })
      .finally(() => setLoading(false));
  }, [currentAccount?.id, selectedSem]);

  const overallPct = attendance?.overallPercentage || currentAccount?.attendancePercentage || 0;
  const presentCount = attendance?.presentClasses || Math.round((attendance?.totalClasses || 0) * (overallPct / 100));
  const absentCount = attendance?.absentClasses || ((attendance?.totalClasses || 0) - presentCount);
  const shortagePct = overallPct >= 75 ? '0%' : `${(75 - overallPct).toFixed(2)}%`;

  // Loading state when no attendance data yet
  if (!attendance || loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 pb-12 font-sans select-none">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-600" />
          <span className="text-sm font-medium">Loading attendance for {currentAccount?.studentName || 'student'}...</span>
        </div>
      </div>
    );
  }

  // Check if semester has no active courses/records
  const hasNoCourses = !attendance.subjects || attendance.subjects.length === 0;

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 font-sans select-none">
      {/* Top SEM Dropdown matching Screenshot 1 */}
      <div className="relative">
        <button
          onClick={() => setShowSemDropdown(!showSemDropdown)}
          className="w-full bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all text-left"
        >
          <span className="font-extrabold text-base text-slate-900 tracking-tight">{selectedSem}</span>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${showSemDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showSemDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-20 space-y-1">
            {['SEM -1', 'SEM -2', 'SEM -3', 'SEM -4'].map(sem => (
              <button
                key={sem}
                onClick={() => {
                  setSelectedSem(sem);
                  setShowSemDropdown(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  selectedSem === sem ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {sem}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Student Subheader Info matching Screenshot 1 */}
      <div className="flex items-center gap-2 px-1 text-xs text-slate-600">
        <span className="font-bold text-slate-900 truncate max-w-[130px]">
          {currentAccount?.studentName || 'Student'}
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-extrabold text-[11px] tracking-wide shrink-0">
          BATCH DIV - {currentAccount?.semester?.toUpperCase().includes('B') ? 'B' : 'A'}
        </span>
        <span className="text-slate-500 font-medium ml-auto sm:ml-0 shrink-0">
          Student ID: {currentAccount?.prn?.slice(-5) || '12091'}
        </span>
      </div>

      {hasNoCourses ? (
        /* Empty / Not Active Semester State */
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">No Active Attendance in {selectedSem}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              You are currently enrolled in <strong>{currentAccount?.semester || 'SEM -1'}</strong>. No lectures or course attendance records are active for {selectedSem} on Juno ERP.
            </p>
          </div>
          <button
            onClick={() => setSelectedSem('SEM -1')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all cursor-pointer"
          >
            Switch to Current Semester (SEM -1)
          </button>
        </div>
      ) : (
        <>
          {/* Overall Attendance Circular Card matching Screenshot 1 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            {/* Left: Circular progress gauge with exact centered viewBox and percentage fit */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                {/* Background track */}
                <circle cx="70" cy="70" r="54" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                {/* Colored arc (yellow/amber #eab308) */}
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  stroke="#eab308"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray="339.29"
                  strokeDashoffset={339.29 * (1 - overallPct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                <span className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">
                  {Number(overallPct).toFixed(Number(overallPct) % 1 === 0 ? 0 : 2)}%
                </span>
                <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Overall</span>
              </div>
            </div>

            {/* Right: Metrics list matching Screenshot 1 */}
            <div className="space-y-3.5 pr-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                <span className="font-extrabold text-slate-900 text-sm">{presentCount}</span>
                <span className="text-slate-400 font-medium text-xs">Present</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0" />
                <span className="font-extrabold text-slate-900 text-sm">{absentCount}</span>
                <span className="text-slate-400 font-medium text-xs">Absent</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shrink-0" />
                <span className="font-extrabold text-slate-900 text-sm">{shortagePct}</span>
                <span className="text-slate-400 font-medium text-xs">Shortage</span>
              </div>
            </div>
          </div>

          {/* Segmented Control Tabs: [Subjects] [Analytics] matching Screenshot 1 */}
          <div className="flex items-center gap-2 p-1 rounded-full bg-slate-200/60 w-full">
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === 'subjects' ? 'bg-black text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Subjects
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === 'analytics' ? 'bg-black text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Analytics
            </button>
          </div>

          {/* Subjects Cards List matching Screenshot 1 */}
          {activeTab === 'subjects' && (
            <div className="space-y-3">
              {attendance.subjects.map((sub, i) => {
                const isSafe = sub.percentage >= 75;
                const isZero = sub.percentage === 0;

                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2.5 transition-all"
                  >
                    {/* Row 1: Title + Percentage */}
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-bold text-[15px] text-slate-900 truncate">{sub.subjectName}</h4>
                      <span
                        className={`font-black text-sm shrink-0 ${
                          isSafe ? 'text-[#10b981]' : isZero ? 'text-[#ef4444]' : 'text-[#eab308]'
                        }`}
                      >
                        {sub.percentage}%
                      </span>
                    </div>

                    {/* Row 2: Subtitle code & faculty */}
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">
                      {sub.subjectCode} · {sub.facultyName}
                    </p>

                    {/* Row 3: Progress Bar matching Screenshot 1 */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSafe ? 'bg-[#10b981]' : isZero ? 'bg-[#ef4444]' : 'bg-[#eab308]'
                        }`}
                        style={{
                          width: `${Math.min(100, isZero ? 0 : Math.max(2, sub.percentage))}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-base text-slate-900">Attendance Analytics & Criteria</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                DYPIU mandates minimum <strong>75% attendance</strong> across all theory and practical courses.
              </p>

              <div className="space-y-2 pt-2">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800">Safe Subjects (≥75%)</span>
                  <span className="font-black text-emerald-700">
                    {attendance.subjects.filter(s => s.percentage >= 75).length} Courses
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-800">Borderline / Warning (&lt;75%)</span>
                  <span className="font-black text-amber-700">
                    {attendance.subjects.filter(s => s.percentage < 75).length} Courses
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
