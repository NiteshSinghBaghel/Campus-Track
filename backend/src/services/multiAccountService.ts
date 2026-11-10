import { DYPIUJunoAdapter } from '../adapters/juno/DYPIUJunoAdapter.js';
import { ERPAdapter, StudentProfile, AttendanceSummary, TimetableSlot, ExamResult } from '../adapters/juno/ERPAdapter.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import fs from 'fs';
import path from 'path';
import https from 'https';

import { fileURLToPath } from 'url';

// ─── KVdb helpers (no npm dep, plain https) ───────────────────────────────────
const KVDB_BUCKET = process.env.KVDB_BUCKET_ID || 'FZbHKEPG8PJqBTnNiWGPSa';

function kvKey(userId: string) {
  return `campus_track_user_${userId}`;
}

function kvGet(userId: string): Promise<ConnectedAccountRecord[] | null> {
  return new Promise((resolve) => {
    const url = `https://kvdb.io/${KVDB_BUCKET}/${kvKey(userId)}`;
    const req = https.get(url, { timeout: 2500 }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode === 200 && body && body.trim() !== '') {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed)) { resolve(parsed); return; }
          } catch {}
        }
        resolve(null);
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

function kvPut(userId: string, records: ConnectedAccountRecord[]): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const body = Buffer.from(JSON.stringify(records));
      const url = new URL(`https://kvdb.io/${KVDB_BUCKET}/${kvKey(userId)}`);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'PUT',
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length
        }
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => resolve(false));
      req.write(body);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

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
 * Load accounts from persistent sources:
 * 1. Local file (accounts.json or accounts.backup.json)
 * 2. ACCOUNTS_DATA env variable (cloud-safe persistent storage)
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

  // Persist per-user to KVdb cloud (non-blocking, fire-and-forget)
  const byUser = new Map<string, ConnectedAccountRecord[]>();
  for (const acc of data) {
    if (!acc.userId) continue;
    if (!byUser.has(acc.userId)) byUser.set(acc.userId, []);
    byUser.get(acc.userId)!.push(acc);
  }
  for (const [userId, records] of byUser) {
    kvPut(userId, records);
  }

  if (data.length > 0) {
    console.log(`[MultiAccountService] Saved ${data.length} accounts (${byUser.size} users) to local + KVdb cloud.`);
  }
}

class MultiAccountService {
  private accounts = loadPersistedAccounts();
  private adapters = new Map<string, DYPIUJunoAdapter>();
  private cloudLoadedUsers = new Set<string>();

  /**
   * Load a user's accounts from KVdb cloud if not already in memory.
   * Called on login and on getAccounts to ensure cross-device sync.
   */
  async loadUserFromCloud(userId: string): Promise<void> {
    if (!userId) return;

    try {
      console.log(`[MultiAccountService] Loading user ${userId} from KVdb cloud...`);
      const cloudRecords = await kvGet(userId);
      if (cloudRecords !== null && Array.isArray(cloudRecords)) {
        // Remove old in-memory accounts for this user that are not in cloud records
        const currentForUser = Array.from(this.accounts.values()).filter(a => a.userId === userId);
        const cloudIds = new Set(cloudRecords.map(r => r.id));
        for (const localAcc of currentForUser) {
          if (!cloudIds.has(localAcc.id)) {
            this.accounts.delete(localAcc.id);
            this.adapters.delete(localAcc.id);
          }
        }

        // Add or update accounts from cloud
        for (const rec of cloudRecords) {
          if (rec.id) {
            rec.userId = userId;
            this.accounts.set(rec.id, rec);
          }
        }

        persistAccounts(this.accounts);
      }
    } catch (e) {
      console.warn('[MultiAccountService] Cloud load failed:', e);
    }
  }

  getAccounts(userId: string): ConnectedAccountRecord[] {
    if (!userId) return [];
    return Array.from(this.accounts.values()).filter(a => a.userId === userId);
  }

  /**
   * Async version that ensures cloud data is loaded first (used on login)
   */
  async getAccountsWithCloudSync(userId: string): Promise<ConnectedAccountRecord[]> {
    if (!userId) return [];
    await this.loadUserFromCloud(userId);
    return this.getAccounts(userId);
  }

  setAdapter(accountId: string, adapter: DYPIUJunoAdapter): void {
    this.adapters.set(accountId, adapter);
  }

  getAccount(id: string): ConnectedAccountRecord | undefined {
    return this.accounts.get(id);
  }

  updateAccount(account: ConnectedAccountRecord): void {
    this.accounts.set(account.id, account);
    persistAccounts(this.accounts);
  }

  saveAccountsBulk(userId: string, records: ConnectedAccountRecord[]): void {
    if (!Array.isArray(records) || !userId) return;
    for (const acc of records) {
      if (acc && acc.id) {
        acc.userId = userId;
        this.accounts.set(acc.id, acc);
      }
    }
    persistAccounts(this.accounts);
  }

  async linkAccountWithAdapter(params: {
    userId: string;
    adapter: DYPIUJunoAdapter;
    profile: StudentProfile;
    username: string;
    password: string;
    isPrimary?: boolean;
  }): Promise<{ account: ConnectedAccountRecord; profile: StudentProfile }> {
    const id = `acc-${Date.now()}`;
    const encryptedPassword = encrypt(params.password);
    const encryptedSession = encrypt(params.adapter.exportSessionCookies());
    const encryptedUsername = encrypt(params.username);

    let initialAttendancePercentage = 0;
    try {
      const summary = await params.adapter.getAttendance();
      initialAttendancePercentage = summary.overallPercentage;
    } catch {}

    const account: ConnectedAccountRecord = {
      id,
      userId: params.userId,
      studentName: params.profile.studentName,
      prn: params.profile.prn || params.username,
      email: params.profile.email || params.username,
      program: params.profile.program || 'Engineering',
      semester: params.profile.semester || 'Current',
      isPrimary: params.isPrimary ?? false,
      connectionStatus: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      attendancePercentage: initialAttendancePercentage,
      encryptedPassword,
      encryptedSession,
      encryptedUsername
    };

    this.accounts.set(id, account);
    this.adapters.set(id, params.adapter);
    persistAccounts(this.accounts);

    return { account, profile: params.profile };
  }

  /**
   * Returns a live, session-restored adapter for the given account.
   * - Imports stored cookies from the encrypted session.
   * - If skipValidation is true (e.g. for fast QR scan), returns immediately without waiting for isSessionValid().
   * - If the session is expired, re-authenticates using the encrypted password.
   */
  async getReadyAdapter(accountId: string, skipValidation = false): Promise<DYPIUJunoAdapter> {
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

    // Fast-path: When scanning QR, do NOT wait 2-3 seconds for isSessionValid()!
    if (skipValidation) {
      return adapter;
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
      a =>
        (typeof a.prn === 'string' && a.prn.toLowerCase() === params.username.toLowerCase()) ||
        (typeof a.email === 'string' && a.email.toLowerCase() === params.username.toLowerCase())
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
        (typeof profile.prn === 'string' && typeof a.prn === 'string' && a.prn.toLowerCase() === profile.prn.toLowerCase()) ||
        (typeof profile.email === 'string' && typeof a.email === 'string' && a.email.toLowerCase() === profile.email.toLowerCase())
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
    const account = this.accounts.get(accountId);
    const program = account?.program || 'MCA';
    const division = (account?.semester?.match(/DIV\s*-\s*([A-Z])/i)?.[1]) || 'A';

    const cacheKey = `${accountId}:${date || 'today'}:${division}`;
    const cached = this.timetableCache.get(cacheKey);
    // Return cached timetable if fresh (< 30 minutes) — INSTANT response
    if (cached && cached.expiresAt > Date.now()) {
      return cached.slots;
    }

    try {
      // 1. First attempt: Try fetching live timetable directly via student's authenticated session
      const readyAdapter = await this.getReadyAdapter(accountId);
      const liveSlots = await readyAdapter.getTimetable(date, program, division);
      if (liveSlots && liveSlots.length > 0) {
        this.timetableCache.set(cacheKey, {
          slots: liveSlots,
          expiresAt: Date.now() + 30 * 60 * 1000
        });
        return liveSlots;
      }
    } catch (e) {
      console.warn(`[MultiAccountService] Live timetable fetch attempt notice for ${accountId}:`, e);
    }

    // 2. Fallback: Serve student's program & division routine
    const fallbackAdapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in');
    const slots = await fallbackAdapter.getTimetable(date, program, division);

    this.timetableCache.set(cacheKey, {
      slots,
      expiresAt: Date.now() + 30 * 60 * 1000
    });

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

  async removeAccount(id: string, fallbackUserId?: string): Promise<boolean> {
    const account = this.accounts.get(id);
    const userId = account?.userId || fallbackUserId;
    this.adapters.delete(id);
    const deleted = this.accounts.delete(id);
    
    // Always persist to local file and sync deletion to KVdb cloud
    persistAccounts(this.accounts);

    if (userId) {
      const remaining = Array.from(this.accounts.values()).filter(a => a.userId === userId);
      await kvPut(userId, remaining);
    }
    
    return deleted || Boolean(account);
  }
}

export const multiAccountService = new MultiAccountService();
