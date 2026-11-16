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
          let subResult: AttendanceSubmissionResult;

          try {
            subResult = await adapter.submitAttendance(sessionInfo, challengeAnswer);
          } catch (innerErr: any) {
            // If session expired, force re-auth then retry once
            if (innerErr?.message?.includes('SESSION_EXPIRED')) {
              console.log(`[GroupEngine] Session expired for ${account.prn}, re-authing...`);
              const freshAdapter = await multiAccountService.getReadyAdapter(account.id, false);
              subResult = await freshAdapter.submitAttendance(sessionInfo, challengeAnswer);
            } else {
              throw innerErr;
            }
          }

          if (subResult.status === 'CONFIRMED' || (subResult.status as any) === 'PRESENT') {
            presentCount++;
            results.push({
              accountId: account.id,
              studentName: account.studentName,
              prn: account.prn,
              status: 'PRESENT',
              message: subResult.message || 'Attendance recorded successfully.',
              confirmationRef: subResult.confirmationRef,
              timestamp: subResult.timestamp || new Date().toISOString()
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
            // Genuine FAILED from Juno — do NOT fake a PRESENT
            failedCount++;
            results.push({
              accountId: account.id,
              studentName: account.studentName,
              prn: account.prn,
              status: 'FAILED',
              message: subResult.message || 'Attendance could not be marked. Please try again.',
              timestamp: new Date().toISOString()
            });
          }
        } catch (err: any) {
          // Real error (network, parse, etc.) — honest FAILED, not fake PRESENT
          failedCount++;
          results.push({
            accountId: account.id,
            studentName: account.studentName,
            prn: account.prn,
            status: 'FAILED',
            message: err?.message || 'Submission failed. Please try again.',
            timestamp: new Date().toISOString()
          });
        }
      })
    );

    return {
      sessionId: `SESSION-${Date.now()}`,
      scannedAt: new Date().toISOString(),
      subjectCode: sessionInfo.subjectCode,
      subjectName: sessionInfo.subjectName,
      facultyName: sessionInfo.facultyName,
      totalEligible: eligibleAccounts.length,
      totalPresent: presentCount,
      totalRequiresVerification: verificationCount,
      totalFailed: failedCount,
      results
    };
  }
}

export const groupAttendanceEngine = new GroupAttendanceEngine();

