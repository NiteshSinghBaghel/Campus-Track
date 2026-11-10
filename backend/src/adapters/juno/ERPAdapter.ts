export interface StudentProfile {
  studentId?: number;
  studentName: string;
  prn: string;
  email: string;
  program?: string;
  semester?: string;
  department?: string;
  avatarUrl?: string;
}

export interface AttendanceSession {
  date: string;
  status: 'PRESENT' | 'ABSENT';
  time?: string;
  facultyName?: string;
  remarks?: string;
}

export interface SubjectAttendance {
  subjectCode: string;
  subjectName: string;
  facultyName?: string;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  percentage: number;
  sessions?: AttendanceSession[];
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
  dayOfWeek: number; // 1-7
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

export interface QRSessionInfo {
  sessionToken: string;
  subjectCode?: string;
  subjectName?: string;
  facultyName?: string;
  validUntil?: string;
  rawPayload: string;
}

export interface AttendanceSubmissionResult {
  status: 'CONFIRMED' | 'VERIFICATION_REQUIRED' | 'FAILED';
  message: string;
  confirmationRef?: string;
  challengeQuestion?: string;
  timestamp: string;
}

export interface ERPAdapter {
  readonly universityCode: string;
  readonly baseUrl: string;

  authenticate(username: string, password: string): Promise<boolean>;
  isSessionValid(): Promise<boolean>;
  getStudentProfile(): Promise<StudentProfile>;
  getAttendance(termId?: string): Promise<AttendanceSummary>;
  getTimetable(date?: string, program?: string, division?: string): Promise<TimetableSlot[]>;
  getResults(): Promise<ExamResult[]>;
  decodeQRSession(qrPayload: string): Promise<QRSessionInfo>;
  submitAttendance(sessionInfo: QRSessionInfo, challengeResponse?: string): Promise<AttendanceSubmissionResult>;
  exportSessionCookies(): string;
  importSessionCookies(serializedCookies: string): void;
  logout(): Promise<void>;
}

