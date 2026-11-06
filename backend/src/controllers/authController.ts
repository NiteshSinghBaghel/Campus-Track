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

      // 1. Authenticate credentials against DYPIU Juno ERP for THIS specific student
      const { DYPIUJunoAdapter } = await import('../adapters/juno/DYPIUJunoAdapter.js');
      const adapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in', true);
      const ok = await adapter.authenticate(cleanUsername, parsed.password);

      if (!ok) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your DYPIU Juno ERP username and password.'
        });
        return;
      }

      // 2. Fetch student profile from Juno ERP
      const profile = await adapter.getStudentProfile();
      const canonicalPrn = (profile.prn && profile.prn !== 'N/A' ? profile.prn : cleanUsername).toLowerCase();
      const userId = `usr_${Buffer.from(canonicalPrn).toString('hex')}`;

      // 3. Check if this student already has an account in this workspace
      //    First load from KVdb cloud to restore cross-device accounts
      await multiAccountService.loadUserFromCloud(userId);
      const userAccounts = multiAccountService.getAccounts(userId);
      let primaryAcc = userAccounts.find(a =>
        a.isPrimary ||
        a.prn.toLowerCase() === canonicalPrn ||
        (profile.email && a.email.toLowerCase() === profile.email.toLowerCase())
      );

      if (!primaryAcc) {
        // Link as primary account for this user's isolated workspace
        const result = await multiAccountService.linkAccountWithAdapter({
          userId,
          adapter,
          profile,
          username: cleanUsername,
          password: parsed.password,
          isPrimary: true
        });
        primaryAcc = result.account;
      } else {
        // Update session and password for existing account
        const { encrypt } = await import('../utils/crypto.js');
        primaryAcc.encryptedPassword = encrypt(parsed.password);
        primaryAcc.encryptedSession = encrypt(adapter.exportSessionCookies());
        primaryAcc.encryptedUsername = encrypt(cleanUsername);
        primaryAcc.connectionStatus = 'CONNECTED';
        primaryAcc.lastSyncedAt = new Date().toISOString();
        if (profile.studentName && profile.studentName !== 'Student') {
          primaryAcc.studentName = profile.studentName;
        }
        multiAccountService.updateAccount(primaryAcc);
        // Cache the live authenticated adapter so images and session work immediately
        multiAccountService.setAdapter(primaryAcc.id, adapter);
      }

      // 4. Generate long-lived JWT token (1 year persistence)
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

      const accounts = await multiAccountService.getAccountsWithCloudSync(req.user.userId);
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

