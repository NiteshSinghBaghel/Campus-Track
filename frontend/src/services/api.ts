import {
  StudentAccount,
  AttendanceSummary,
  TimetableSlot,
  GroupAttendanceBatchResponse,
  AuthUser
} from '../types/index.js';

// In production, VITE_API_BASE_URL points to Render backend (e.g. https://campus-track-backend.onrender.com)
// In local dev, we use the Vite proxy at /api -> http://127.0.0.1:5005
// If VITE_API_BASE_URL is not set (misconfigured Vercel deploy), fall back to same-origin /api
export const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

// Render backend URL — used for health pre-warm ping (always absolute)
// This must match the actual Render service URL
export const RENDER_BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

const TOKEN_KEY = 'campustrack_jwt_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }
};

/**
 * Robust fetch wrapper with authorization header injection and client-side timeout
 */
async function request<T>(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 35-second default timeout to handle cold-starting instances smoothly
  const timeoutMs = options?.timeoutMs ?? 35000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal: options?.signal || controller.signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection or wait a moment while the server wakes up.');
    }
    throw new Error(
      'Backend server is not reachable. Please check your network connection.'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: res.statusText || 'Unexpected server response' };
    }
  }

  if (!res.ok) {
    let errorMsg = data?.message || `Request failed with HTTP status ${res.status}`;
    if (typeof errorMsg === 'string' && errorMsg.startsWith('[') && errorMsg.includes('"message"')) {
      try {
        const parsed = JSON.parse(errorMsg);
        if (Array.isArray(parsed)) {
          errorMsg = parsed.map((p: any) => p.message || p.code).join(', ');
        }
      } catch {}
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  getAccountImageUrl(accountId: string): string {
    return `${API_BASE}/accounts/${accountId}/image`;
  },

  /**
   * Pre-warm Render backend on page load so cold boot finishes before user clicks login
   */
  wakeUpBackend(): void {
    try {
      // Ping /health on the backend (absolute URL if we know it, otherwise relative)
      const healthUrl = RENDER_BACKEND_URL
        ? `${RENDER_BACKEND_URL}/health`
        : `${API_BASE.replace('/api', '')}/health`;
      fetch(healthUrl, { mode: 'cors' }).catch(() => {});
    } catch {}
  },

  async login(params: { username: string; password: string }): Promise<{ token: string; user: AuthUser; attendance?: AttendanceSummary }> {
    // Generous 75s timeout to allow Render container cold boot (~35-45s) + Juno ERP roundtrip (~5s)
    const doLogin = () =>
      request<{ success: boolean; token: string; user: AuthUser; attendance?: AttendanceSummary }>(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        timeoutMs: 75000
      });

    let data: { success: boolean; token: string; user: AuthUser; attendance?: AttendanceSummary };
    try {
      data = await doLogin();
    } catch (err: any) {
      // Auto-retry once on timeout or network error (container likely finished waking up)
      const msg = err?.message || '';
      if (msg.includes('timed out') || msg.includes('not reachable')) {
        data = await doLogin();
      } else {
        throw err;
      }
    }

    if (data.token) {
      authStorage.setToken(data.token);
    }
    return { token: data.token, user: data.user, attendance: data.attendance };
  },

  async getMe(): Promise<{ user: AuthUser } | null> {
    try {
      const data = await request<{ success: boolean; user: AuthUser }>(`${API_BASE}/auth/me`);
      return { user: data.user };
    } catch {
      return null;
    }
  },

  async getAccounts(): Promise<StudentAccount[]> {
    try {
      const data = await request<{ success: boolean; accounts: StudentAccount[] }>(`${API_BASE}/accounts`);
      return data.accounts || [];
    } catch (err) {
      console.warn('Failed to fetch accounts:', err);
      return [];
    }
  },

  async syncVault(accounts: any[]): Promise<StudentAccount[]> {
    try {
      const data = await request<{ success: boolean; accounts: StudentAccount[] }>(`${API_BASE}/accounts/sync-vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts })
      });
      return data.accounts || [];
    } catch {
      return [];
    }
  },

  async linkAccount(params: {
    username: string;
    password: string;
    grantorConsent: boolean;
    isPrimary?: boolean;
  }): Promise<{ account: StudentAccount; message: string }> {
    return request<{ account: StudentAccount; message: string }>(`${API_BASE}/accounts/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  },

  async syncAccount(id: string): Promise<AttendanceSummary> {
    const data = await request<{ success: boolean; summary: AttendanceSummary }>(`${API_BASE}/accounts/${id}/sync`, {
      method: 'POST'
    });
    return data.summary;
  },

  async removeAccount(id: string): Promise<void> {
    await request<void>(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
  },

  async getAttendance(accountId: string, termId?: string, forceRefresh = false): Promise<AttendanceSummary> {
    let query = termId ? `?termId=${encodeURIComponent(termId)}` : '';
    if (forceRefresh) query += (query ? '&' : '?') + 'force=true';
    const data = await request<{ success: boolean; summary: AttendanceSummary }>(`${API_BASE}/attendance/${accountId}${query}`);
    return data.summary;
  },

  async getTimetable(accountId: string, date?: string): Promise<TimetableSlot[]> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const data = await request<{ success: boolean; timetable: TimetableSlot[] }>(`${API_BASE}/attendance/${accountId}/timetable${query}`);
    return data.timetable || [];
  },

  async submitOneScan(params: {
    qrPayload: string;
    targetAccountIds?: string[];
    challengeResponses?: Record<string, string>;
  }): Promise<GroupAttendanceBatchResponse> {
    const data = await request<{ success: boolean; batch: GroupAttendanceBatchResponse }>(`${API_BASE}/attendance/one-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      // 12s timeout: QR window is 10s but backend parallel processing needs a bit extra
      timeoutMs: 12000
    });
    return data.batch;
  },

  /**
   * Pre-warm all Juno sessions so cookies are fresh before QR scanning begins.
   * Called on ScannerPage mount — non-blocking, errors are silently ignored.
   */
  async preWarmSessions(): Promise<void> {
    try {
      await request<{ success: boolean }>(`${API_BASE}/attendance/pre-warm`, {
        method: 'POST',
        timeoutMs: 25000
      });
    } catch {
      // Non-fatal — scanner still works, just may need re-auth on first scan
    }
  }
};
