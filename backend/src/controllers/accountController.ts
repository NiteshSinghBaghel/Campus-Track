import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { multiAccountService } from '../services/multiAccountService.js';
import { z } from 'zod';

const linkAccountSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  isPrimary: z.boolean().optional(),
  grantorConsent: z.boolean().refine(val => val === true, 'Consent must be explicitly granted')
});

export const accountController = {
  async getAccounts(req: AuthenticatedRequest, res: Response) {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
      return;
    }
    const userId = req.user.userId;
    const accounts = await multiAccountService.getAccountsWithCloudSync(userId);
    // Strip sensitive encrypted password from API response
    const sanitized = accounts.map(({ encryptedPassword, encryptedSession, ...rest }) => rest);
    res.json({ success: true, accounts: sanitized });
  },

  syncVault(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { accounts } = req.body;
      if (Array.isArray(accounts) && accounts.length > 0) {
        multiAccountService.saveAccountsBulk(userId, accounts);
      }
      const all = multiAccountService.getAccounts(userId);
      const sanitized = all.map(({ encryptedPassword, encryptedSession, ...rest }) => rest);
      res.json({ success: true, accounts: sanitized });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async linkAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = linkAccountSchema.parse(req.body);
      const userId = req.user?.userId || 'user-default';

      const result = await multiAccountService.linkAccount({
        userId,
        username: parsed.username,
        password: parsed.password,
        isPrimary: parsed.isPrimary,
        grantorConsent: parsed.grantorConsent
      });

      const { encryptedPassword, encryptedSession, ...sanitized } = result.account;
      res.status(201).json({
        success: true,
        message: 'Student account connected successfully',
        account: sanitized,
        profile: result.profile
      });
    } catch (err) {
      let message = 'Failed to connect student account';
      if (err instanceof z.ZodError) {
        message = err.issues
  .map((e) => `${e.path.join('.')}: ${e.message}`)
  .join(', ');
      } else if (err instanceof Error) {
        message = err.message;
      }
      res.status(400).json({
        success: false,
        message
      });
    }
  },

  async syncAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const accountId = req.params.id as string;
      const summary = await multiAccountService.syncAccountAttendance(accountId);
      res.json({ success: true, summary });
    } catch (err) {
      res.status(404).json({ success: false, message: (err as Error).message });
    }
  },

  async deleteAccount(req: AuthenticatedRequest, res: Response) {
    const accountId = req.params.id as string;
    const userId = req.user?.userId;
    const deleted = await multiAccountService.removeAccount(accountId, userId);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }
    res.json({ success: true, message: 'Account removed successfully' });
  },

  async getAccountImage(req: AuthenticatedRequest, res: Response) {
    try {
      const accountId = req.params.id as string;
      const imgData = await multiAccountService.getAccountImageBuffer(accountId);
      if (!imgData || !imgData.buffer) {
        res.status(404).send('Profile image not found');
        return;
      }
      // Force JPEG content-type since Juno returns wrong 'application/json' header for image binary
      const ctHeader = imgData.buffer && imgData.buffer[0] === 0xFF && imgData.buffer[1] === 0xD8
        ? 'image/jpeg'
        : (imgData.contentType.startsWith('image/') ? imgData.contentType : 'image/jpeg');
      res.setHeader('Content-Type', ctHeader);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgData.buffer);
    } catch (err) {
      res.status(500).send('Failed to fetch image');
    }
  }
};

