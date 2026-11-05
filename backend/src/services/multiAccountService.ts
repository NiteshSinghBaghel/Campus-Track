import { DYPIUJunoAdapter } from '../adapters/juno/DYPIUJunoAdapter.js';
import { ERPAdapter, StudentProfile, AttendanceSummary, TimetableSlot, ExamResult } from '../adapters/juno/ERPAdapter.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

export interface ConnectedAccountRecord {
  id: string;
  userId: string;
  studentName: string;
  prn: string;
  email: string;
  program: string;
  semester: string;
  isPrimary: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';
  lastSyncedAt?: string;
  attendancePercentage: number;
  encryptedPassword?: string;
  encryptedSession?: string;
  encryptedUsername?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/accounts.json');
const DATA_BACKUP_FILE = path.resolve(__dirname, '../../data/accounts.backup.json');

function loadPersistedAccounts(): Map<string, ConnectedAccountRecord> {
  const map = new Map<string, ConnectedAccountRecord>();
  try {
    const fileToRead = fs.existsSync(DATA_FILE) ? DATA_FILE : (fs.existsSync(DATA_BACKUP_FILE) ? DATA_BACKUP_FILE : null);
    if (fileToRead) {
      const raw = fs.readFileSync(fileToRead, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const acc of data) {
          map.set(acc.id, acc);
        }
      }
    }
  } catch (e) {
    console.warn('[MultiAccountService] Failed to load persisted accounts:', e);
  }
  return map;
}

function persistAccounts(accounts: Map<string, ConnectedAccountRecord>) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized = JSON.stringify(Array.from(accounts.values()), null, 2);
    fs.writeFileSync(DATA_FILE, serialized, 'utf-8');
    fs.writeFileSync(DATA_BACKUP_FILE, serialized, 'utf-8');
  } catch (e) {
    console.warn('[MultiAccountService] Failed to save accounts:', e);
  }
}

class MultiAccountService {
  private accounts = loadPersistedAccounts();
  private adapters = new Map<string, DYPIUJunoAdapter>();

  getAccounts(userId: string): ConnectedAccountRecord[] {
    return Array.from(this.accounts.values()).filter(
      a => a.userId === userId
    );
  }

  getAccount(id: string): ConnectedAccountRecord | undefined {
    return this.accounts.get(id);
  }

  /**
   * Returns a live, session-restored adapter for the given account.
   * - Imports stored cookies from the encrypted session.
   * - If the session is expired, re-authenticates using the encrypted password.
   * - Throws if the account has no stored credentials.
   */
  async getReadyAdapter(accountId: string): Promise<DYPIUJunoAdapter> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    let adapter = this.adapters.get(accountId);
    if (!adapter) {
      adapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in', true);
      this.adapters.set(accountId, adapter);
    }

    // 1. Restore cookie jar from stored encrypted session
    if (account.encryptedSession) {
      try {
        const sessionJson = decrypt(account.encryptedSession);
        adapter.importSessionCookies(sessionJson);
      } catch (e) {
        console.warn(`[MultiAccount] Cookie restore failed for ${accountId}:`, e);
      }
    }

    // 2. Validate session; re-auth seamlessly if expired
    let valid = false;
    try {
      valid = await adapter.isSessionValid();
    } catch {
      valid = false;
    }

    if (!valid) {
      if (account.encryptedPassword && account.encryptedUsername) {
        try {
          const password = decrypt(account.encryptedPassword);
          const username = decrypt(account.encryptedUsername);
          const ok = await adapter.authenticate(username, password);

          if (ok) {
            // Save refreshed session cookies
            account.encryptedSession = encrypt(adapter.exportSessionCookies());
            account.connectionStatus = 'CONNECTED';
            this.accounts.set(accountId, account);
            persistAccounts(this.accounts);
            return adapter;
          }
        } catch (authErr) {
          console.warn(`[MultiAccount] Seamless auto re-auth attempt notice for ${accountId}:`, authErr);
        }
      }

      // Even if network or ERP server is temporarily unreachable, DO NOT flip status to EXPIRED.
      // Retain account as CONNECTED until user explicitly deletes it.
      account.connectionStatus = 'CONNECTED';
      this.accounts.set(accountId, account);
      persistAccounts(this.accounts);
    }

    return adapter;
  }

  async linkAccount(params: {
    userId: string;
    username: string;
    password: string;
    isPrimary?: boolean;
    grantorConsent: boolean;
  }): Promise<{ account: ConnectedAccountRecord; profile: StudentProfile }> {
    if (!params.grantorConsent) {
      throw new Error('Explicit student consent is required to link this account.');
    }

    const adapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in', true);
    const ok = await adapter.authenticate(params.username, params.password);

    if (!ok) {
      throw new Error(
        'Failed to authenticate with DYPIU Juno ERP. Please verify username and password.'
      );
    }

    const profile = await adapter.getStudentProfile();
    const id = `acc-${Date.now()}`;
    const encryptedPassword = encrypt(params.password);
    const encryptedSession = encrypt(adapter.exportSessionCookies());
    const encryptedUsername = encrypt(params.username);

    // Auto-sync attendance immediately upon linking
    let initialAttendancePercentage = 0;
    try {
      const summary = await adapter.getAttendance();
      initialAttendancePercentage = summary.overallPercentage;
    } catch (e) {
      console.warn('[MultiAccount] Immediate initial attendance sync notice:', e);
    }

    const account: ConnectedAccountRecord = {
      id,
      userId: params.userId,
      studentName: profile.studentName,
      prn: profile.prn || params.username,
      email: profile.email || params.username,
      program: profile.program || 'Engineering',
      semester: profile.semester || 'Current',
      isPrimary: params.isPrimary ?? false,
      connectionStatus: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      attendancePercentage: initialAttendancePercentage,
      encryptedPassword,
      encryptedSession,
      encryptedUsername
    };

    this.accounts.set(id, account);
    this.adapters.set(id, adapter);
    persistAccounts(this.accounts);

    return { account, profile };
  }

  async syncAccountAttendance(accountId: string, termId?: string): Promise<AttendanceSummary> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('Account not found');

    try {
      const adapter = await this.getReadyAdapter(accountId);
      const summary = await adapter.getAttendance(termId);
      account.attendancePercentage = summary.overallPercentage;
      account.lastSyncedAt = summary.lastSyncedAt;
      account.connectionStatus = 'CONNECTED';
      this.accounts.set(accountId, account);
      persistAccounts(this.accounts);
      return summary;
    } catch (err) {
      // If live ERP session expired, still return latest cached/curriculum attendance
      const fallbackAdapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in');
      const fallbackSummary = await fallbackAdapter.getAttendance(termId);
      fallbackSummary.overallPercentage = account.attendancePercentage || fallbackSummary.overallPercentage;
      return fallbackSummary;
    }
  }

  async getAccountTimetable(accountId: string, date?: string): Promise<TimetableSlot[]> {
    try {
      const adapter = await this.getReadyAdapter(accountId);
      return await adapter.getTimetable(date);
    } catch (e) {
      // If live session is expired, still serve timetable curriculum slots
      const fallbackAdapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in');
      return await fallbackAdapter.getTimetable(date);
    }
  }

  async getAccountResults(accountId: string): Promise<ExamResult[]> {
    const adapter = await this.getReadyAdapter(accountId);
    return adapter.getResults();
  }

  async getAccountProfile(accountId: string): Promise<StudentProfile> {
    const adapter = await this.getReadyAdapter(accountId);
    return adapter.getStudentProfile();
  }

  async getAccountImageBuffer(accountId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const adapter = await this.getReadyAdapter(accountId);
      return await adapter.getProfileImageBuffer();
    } catch (e) {
      console.warn(`[MultiAccountService] getAccountImageBuffer failed for ${accountId}:`, e);
      return null;
    }
  }

  removeAccount(id: string): boolean {
    this.adapters.delete(id);
    const deleted = this.accounts.delete(id);
    if (deleted) persistAccounts(this.accounts);
    return deleted;
  }
}

export const multiAccountService = new MultiAccountService();
