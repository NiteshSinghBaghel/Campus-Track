export interface StudentAccount {
  id: string;
  studentName: string;
  prn: string;
  email: string;
  program: string;
  semester: string;
  isPrimary: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';
  lastSyncedAt?: string;
  attendancePercentage: number;
  avatarUrl?: string;
}

export interface AuthUser {
  userId: string;
  email?: string;
  primaryAccount: StudentAccount | null;
}

export interface SubjectAttendance {
  subjectCode: string;
  subjectName: string;
  facultyName?: string;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  percentage: number;
}

export interface AttendanceSummary {
  overallPercentage: number;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  subjects: SubjectAttendance[];
  lastSyncedAt: string;
}

export interface TimetableSlot {
  dayOfWeek: number;
  subjectName: string;
  facultyName?: string;
  classroom?: string;
  startTime: string;
  endTime: string;
}

export interface ExamResult {
  semester: string;
  subjectCode: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  grade?: string;
  sgpa?: number;
  cgpa?: number;
}

export interface GroupAttendanceResultItem {
  accountId: string;
  studentName: string;
  prn: string;
  status: 'PRESENT' | 'VERIFICATION_REQUIRED' | 'FAILED' | 'PENDING';
  message: string;
  confirmationRef?: string;
  challengeQuestion?: string;
  timestamp: string;
}

export interface GroupAttendanceBatchResponse {
  sessionId: string;
  scannedAt: string;
  subjectCode?: string;
  subjectName?: string;
  facultyName?: string;
  totalEligible: number;
  totalPresent: number;
  totalRequiresVerification: number;
  totalFailed: number;
  results: GroupAttendanceResultItem[];
}

