import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { multiAccountService } from '../services/multiAccountService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const authController = {
  /**
   * Primary Login: Authenticates student via Juno ERP, registers them as the Primary User,
   * generates a persistent JWT token for this user's isolated workspace.
   */
  async primaryLogin(req: Request, res: Response) {
    try {
      const parsed = loginSchema.parse(req.body);
      const cleanUsername = parsed.username.trim();

      // Check if primary account already exists in database (matching email, PRN, or userId)
      const allAccounts = multiAccountService.getAccounts('');
      let primaryAcc = allAccounts.find(a =>
        a.isPrimary ||
        a.prn.toLowerCase() === cleanUsername.toLowerCase() ||
        a.email.toLowerCase() === cleanUsername.toLowerCase()
      );

      const userId = primaryAcc?.userId || `usr_${Buffer.from(cleanUsername.toLowerCase()).toString('hex')}`;

      if (!primaryAcc) {
        // Link as primary account
        const result = await multiAccountService.linkAccount({
          userId,
          username: cleanUsername,
          password: parsed.password,
          isPrimary: true,
          grantorConsent: true
        });
        primaryAcc = result.account;
      }

      // Generate long-lived JWT token (1 year persistence)
      const token = jwt.sign(
        {
          userId,
          email: primaryAcc.email || cleanUsername,
          prn: primaryAcc.prn,
          studentName: primaryAcc.studentName
        },
        config.jwtSecret,
        { expiresIn: '365d' }
      );

      const { encryptedPassword, encryptedSession, encryptedUsername, ...sanitized } = primaryAcc as any;

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          userId,
          primaryAccount: sanitized
        }
      });
    } catch (err: any) {
      console.error('[authController] primaryLogin error:', err);
      let msg = err.message || 'Login failed';
      if (err instanceof z.ZodError) {
        msg = err.issues.map(i => i.message).join(', ');
      }
      res.status(400).json({
        success: false,
        message: msg
      });
    }
  },

  /**
   * Return current logged in session info
   */
  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const accounts = multiAccountService.getAccounts(req.user.userId);
      const primary = accounts.find(a => a.isPrimary) || accounts[0] || null;

      res.json({
        success: true,
        user: {
          userId: req.user.userId,
          email: req.user.email,
          primaryAccount: primary ? (({ encryptedPassword, encryptedSession, encryptedUsername, ...r }: any) => r)(primary) : null
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

