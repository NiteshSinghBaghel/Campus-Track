import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { multiAccountService } from '../services/multiAccountService.js';
import { groupAttendanceEngine } from '../services/groupAttendanceEngine.js';
import { z } from 'zod';

const oneScanSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
  targetAccountIds: z.array(z.string()).optional(),
  challengeResponses: z.record(z.string()).optional()
});

export const attendanceController = {
  async getAccountAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      const accountId = req.params.accountId as string;
      const termId = req.query.termId as string | undefined;
      const summary = await multiAccountService.syncAccountAttendance(accountId, termId);
      res.json({ success: true, summary });
    } catch (err) {
      const message = (err as Error).message;
      const isSessionIssue =
        message.includes('expired') || message.includes('re-link') || message.includes('Session');
      res.status(isSessionIssue ? 401 : 500).json({
        success: false,
        message,
        requiresReauth: isSessionIssue
      });
    }
  },

  async processOneScan(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = oneScanSchema.parse(req.body);
      const userId = req.user?.userId || 'user-default';

      const batchResult = await groupAttendanceEngine.processOneScan({
        userId,
        qrPayload: parsed.qrPayload,
        targetAccountIds: parsed.targetAccountIds,
        challengeResponses: parsed.challengeResponses
      });

      res.json({ success: true, batch: batchResult });
    } catch (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
    }
  },

  async getTimetable(req: AuthenticatedRequest, res: Response) {
    try {
      const accountId = req.params.accountId as string;
      const date = req.query.date as string | undefined;
      const slots = await multiAccountService.getAccountTimetable(accountId, date);
      res.json({ success: true, timetable: slots, liveData: true });
    } catch (err) {
      const message = (err as Error).message;
      const isSessionIssue =
        message.includes('expired') || message.includes('re-link') || message.includes('Session');
      res.status(isSessionIssue ? 401 : 500).json({
        success: false,
        message,
        requiresReauth: isSessionIssue
      });
    }
  },

  async getResults(req: AuthenticatedRequest, res: Response) {
    try {
      const accountId = req.params.accountId as string;
      const results = await multiAccountService.getAccountResults(accountId);
      res.json({ success: true, results, liveData: true });
    } catch (err) {
      const message = (err as Error).message;
      const isSessionIssue =
        message.includes('expired') || message.includes('re-link') || message.includes('Session');
      res.status(isSessionIssue ? 401 : 500).json({
        success: false,
        message,
        requiresReauth: isSessionIssue
      });
    }
  },

  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const accountId = req.params.accountId as string;
      const profile = await multiAccountService.getAccountProfile(accountId);
      res.json({ success: true, profile, liveData: true });
    } catch (err) {
      const message = (err as Error).message;
      const isSessionIssue =
        message.includes('expired') || message.includes('re-link') || message.includes('Session');
      res.status(isSessionIssue ? 401 : 500).json({
        success: false,
        message,
        requiresReauth: isSessionIssue
      });
    }
  }
};
