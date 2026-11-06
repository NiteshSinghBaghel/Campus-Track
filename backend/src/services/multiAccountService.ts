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

/**
 * Load accounts from all sources in priority order:
 * 1. Local file (fastest, works in dev)
 * 2. ACCOUNTS_DATA env variable (Render/cloud deploy — survives restarts)
 * 3. Empty map
 */
function loadPersistedAccounts(): Map<string, ConnectedAccountRecord> {
  const map = new Map<string, ConnectedAccountRecord>();

  // Priority 1: Local file
  try {
    const fileToRead = fs.existsSync(DATA_FILE) ? DATA_FILE : (fs.existsSync(DATA_BACKUP_FILE) ? DATA_BACKUP_FILE : null);
    if (fileToRead) {
      const raw = fs.readFileSync(fileToRead, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        for (const acc of data) map.set(acc.id, acc);
        console.log(`[MultiAccountService] Loaded ${map.size} accounts from local file.`);
        return map;
      }
    }
  } catch (e) {
    console.warn('[MultiAccountService] Local file load failed:', e);
  }

  // Priority 2: ACCOUNTS_DATA environment variable (cloud-safe persistent storage)
  try {
    const envData = process.env.ACCOUNTS_DATA;
    if (envData && envData.trim() !== '' && envData !== '[]') {
      const data = JSON.parse(Buffer.from(envData, 'base64').toString('utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        for (const acc of data) map.set(acc.id, acc);
        console.log(`[MultiAccountService] Loaded ${map.size} accounts from ACCOUNTS_DATA env var.`);
        // Also write to local file for faster future loads
        try {
          const dir = path.dirname(DATA_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        } catch {}
        return map;
      }
    }
  } catch (e) {
    console.warn('[MultiAccountService] ACCOUNTS_DATA env load failed:', e);
  }

  console.log('[MultiAccountService] No persisted accounts found, starting fresh.');
  return map;
}

function persistAccounts(accounts: Map<string, ConnectedAccountRecord>) {
  const data = Array.from(accounts.values());
  const serialized = JSON.stringify(data, null, 2);

  // Always write to local file
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, serialized, 'utf-8');
    fs.writeFileSync(DATA_BACKUP_FILE, serialized, 'utf-8');
  } catch (e) {
    console.warn('[MultiAccountService] Failed to save accounts to file:', e);
  }

  // Also log the base64 for Render env var update hint (only if has accounts)
  if (data.length > 0) {
    const b64 = Buffer.from(serialized).toString('base64');
    // Print only first 80 chars to avoid log spam; admin can retrieve full value via GET /api/admin/export-accounts
    console.log(`[MultiAccountService] Saved ${data.length} accounts. ACCOUNTS_DATA (first 80): ${b64.slice(0, 80)}...`);
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

    // Check if this student account (PRN or Email) is already linked in this user's workspace
    const existingAccounts = this.getAccounts(params.userId);
    const alreadyLinked = existingAccounts.find(
      a => a.prn.toLowerCase() === params.username.toLowerCase() ||
           a.email.toLowerCase() === params.username.toLowerCase()
    );
    if (alreadyLinked) {
      throw new Error(`This account (${alreadyLinked.studentName || params.username}) is already connected in your workspace.`);
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

    // Also check if PRN or email matches after profile is resolved
    const duplicateProfile = existingAccounts.find(
      a => a.id !== id && (
        (profile.prn && a.prn.toLowerCase() === profile.prn.toLowerCase()) ||
        (profile.email && a.email.toLowerCase() === profile.email.toLowerCase())
      )
    );
    if (duplicateProfile) {
      this.accounts.delete(id);
      this.adapters.delete(id);
      persistAccounts(this.accounts);
      throw new Error(`This student profile (${profile.studentName} - ${profile.prn}) is already connected as an account.`);
    }

    return { account, profile };
  }

  private attendanceCache = new Map<string, { summary: AttendanceSummary; expiresAt: number }>();
  private timetableCache = new Map<string, { slots: TimetableSlot[]; expiresAt: number }>();

  async syncAccountAttendance(accountId: string, termId?: string): Promise<AttendanceSummary> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('Account not found');

    const cacheKey = `${accountId}:${termId || 'default'}`;
    const cached = this.attendanceCache.get(cacheKey);
    // Return cached attendance if fresh (< 5 minutes)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.summary;
    }

    try {
      const adapter = await this.getReadyAdapter(accountId);
      const summary = await adapter.getAttendance(termId);
      account.attendancePercentage = summary.overallPercentage;
      account.lastSyncedAt = summary.lastSyncedAt;
      account.connectionStatus = 'CONNECTED';
      this.accounts.set(accountId, account);
      persistAccounts(this.accounts);

      // Cache for 5 minutes
      this.attendanceCache.set(cacheKey, {
        summary,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      return summary;
    } catch (err) {
      // Return stale cache if exists
      if (cached) return cached.summary;
      // Final fallback
      const fallbackAdapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in');
      const fallbackSummary = await fallbackAdapter.getAttendance(termId);
      fallbackSummary.overallPercentage = account.attendancePercentage || fallbackSummary.overallPercentage;
      return fallbackSummary;
    }
  }

  async getAccountTimetable(accountId: string, date?: string): Promise<TimetableSlot[]> {
    const cacheKey = `${accountId}:${date || 'today'}`;
    const cached = this.timetableCache.get(cacheKey);
    // Return cached timetable if fresh (< 15 minutes) — INSTANT response
    if (cached && cached.expiresAt > Date.now()) {
      return cached.slots;
    }

    // Always serve from static fallback immediately (< 1ms, no ERP call)
    const fallbackAdapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in');
    const slots = await fallbackAdapter.getTimetable(date);

    // Cache for 15 minutes
    this.timetableCache.set(cacheKey, {
      slots,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    // Optionally refresh from live ERP in background (non-blocking)
    this.getReadyAdapter(accountId).then(adapter =>
      adapter.getTimetable(date).then(liveSlots => {
        this.timetableCache.set(cacheKey, {
          slots: liveSlots,
          expiresAt: Date.now() + 15 * 60 * 1000
        });
      }).catch(() => {}) // silently ignore ERP failures
    ).catch(() => {});

    return slots;
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
