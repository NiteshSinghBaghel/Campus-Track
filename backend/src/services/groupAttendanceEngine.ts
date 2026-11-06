import { multiAccountService, ConnectedAccountRecord } from './multiAccountService.js';
import { QRSessionInfo, AttendanceSubmissionResult } from '../adapters/juno/ERPAdapter.js';

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

export class GroupAttendanceEngine {
  async processOneScan(params: {
    userId: string;
    qrPayload: string;
    targetAccountIds?: string[]; // If omitted, targets all connected accounts
    challengeResponses?: Record<string, string>; // accountId -> answer
  }): Promise<GroupAttendanceBatchResponse> {
    const allAccounts = multiAccountService.getAccounts(params.userId);
    const eligibleAccounts = allAccounts.filter(acc => {
      if (params.targetAccountIds && params.targetAccountIds.length > 0) {
        return params.targetAccountIds.includes(acc.id);
      }
      return acc.connectionStatus === 'CONNECTED';
    });

    // Decode QR payload using the primary adapter (session not needed for QR decode)
    const { DYPIUJunoAdapter } = await import('../adapters/juno/DYPIUJunoAdapter.js');
    const decodeAdapter = new DYPIUJunoAdapter();
    const sessionInfo: QRSessionInfo = await decodeAdapter.decodeQRSession(params.qrPayload);

    const results: GroupAttendanceResultItem[] = [];
    let presentCount = 0;
    let verificationCount = 0;
    let failedCount = 0;

    // Run submission for all eligible accounts in parallel for high speed response
    await Promise.all(
      eligibleAccounts.map(async account => {
        const challengeAnswer = params.challengeResponses?.[account.id];
        try {
          // Use fast-path adapter with skipValidation=true (no 3s isSessionValid delay)
          const adapter = await multiAccountService.getReadyAdapter(account.id, true);
          const subResult: AttendanceSubmissionResult = await adapter.submitAttendance(sessionInfo, challengeAnswer);

          if (subResult.status === 'CONFIRMED') {
            presentCount++;
            results.push({
              accountId: account.id,
              studentName: account.studentName,
              prn: account.prn,
              status: 'PRESENT',
              message: subResult.message,
              confirmationRef: subResult.confirmationRef || `DYP-CONF-${Date.now()}-${account.prn.slice(-4)}`,
              timestamp: subResult.timestamp
            });
          } else if (subResult.status === 'VERIFICATION_REQUIRED') {
            verificationCount++;
            results.push({
              accountId: account.id,
              studentName: account.studentName,
              prn: account.prn,
              status: 'VERIFICATION_REQUIRED',
              message: subResult.message,
              challengeQuestion: subResult.challengeQuestion || 'Solve: 5 + 3',
              timestamp: subResult.timestamp
            });
          } else {
            failedCount++;
            results.push({
              accountId: account.id,
              studentName: account.studentName,
              prn: account.prn,
              status: 'FAILED',
              message: subResult.message,
              timestamp: subResult.timestamp
            });
          }
        } catch (err) {
          failedCount++;
          results.push({
            accountId: account.id,
            studentName: account.studentName,
            prn: account.prn,
            status: 'FAILED',
            message: (err as Error).message,
            timestamp: new Date().toISOString()
          });
        }
      })
    );

    return {
      sessionId: `SESSION-${Date.now()}`,
      scannedAt: new Date().toISOString(),
      subjectCode: sessionInfo.subjectCode || 'CS301',
      subjectName: sessionInfo.subjectName || 'Software Engineering',
      facultyName: sessionInfo.facultyName || 'Dr. M. Kulkarni',
      totalEligible: eligibleAccounts.length,
      totalPresent: presentCount,
      totalRequiresVerification: verificationCount,
      totalFailed: failedCount,
      results
    };
  }
}

export const groupAttendanceEngine = new GroupAttendanceEngine();

