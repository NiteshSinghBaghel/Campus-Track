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

  async primaryLogin(req: Request, res: Response) {
    try {
      const parsed = loginSchema.parse(req.body);
      const cleanUsername = parsed.username.trim();

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

      const profile = await adapter.getStudentProfile();
      const canonicalPrn = (profile.prn && profile.prn !== 'N/A' ? profile.prn : cleanUsername).toLowerCase();
      const userId = `usr_${Buffer.from(canonicalPrn).toString('hex')}`;


      await multiAccountService.loadUserFromCloud(userId);
      const userAccounts = multiAccountService.getAccounts(userId);
      let primaryAcc = userAccounts.find(a => {
        const savedPrn = typeof a.prn === 'string' ? a.prn.toLowerCase() : '';
        const savedEmail = typeof a.email === 'string' ? a.email.toLowerCase() : '';
        const currentEmail = typeof profile.email === 'string' ? profile.email.toLowerCase() : '';

        return (
          a.isPrimary ||
          (savedPrn !== '' && savedPrn === canonicalPrn) ||
          (currentEmail !== '' && savedEmail !== '' && savedEmail === currentEmail)
        );
      });

      if (!primaryAcc) {
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
        multiAccountService.setAdapter(primaryAcc.id, adapter);
      }

      // 4. Fetch live attendance right at login so primaryAcc has the real percentage immediately
      let liveAttendance: any = null;
      try {
        liveAttendance = await adapter.getAttendance();
        if (liveAttendance && typeof liveAttendance.overallPercentage === 'number') {
          primaryAcc.attendancePercentage = liveAttendance.overallPercentage;
          primaryAcc.lastSyncedAt = liveAttendance.lastSyncedAt;
          multiAccountService.updateAccount(primaryAcc);
          multiAccountService.setCachedAttendance(primaryAcc.id, liveAttendance);
        }
      } catch (attErr) {
        console.warn('[authController] Login attendance sync notice:', attErr);
      }

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
        },
        attendance: liveAttendance
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
