import {
  StudentAccount,
  AttendanceSummary,
  TimetableSlot,
  GroupAttendanceBatchResponse,
  AuthUser
} from '../types/index.js';

// In production, VITE_API_BASE_URL points to Render backend (e.g. https://campus-track-backend.onrender.com)
// In local dev, we use the Vite proxy at /api -> http://127.0.0.1:5005
export const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

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
 * Robust fetch wrapper with authorization header injection
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(
      'Backend server is not reachable. Please check your network connection.'
    );
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

  async login(params: { username: string; password: string }): Promise<{ token: string; user: AuthUser }> {
    const data = await request<{ success: boolean; token: string; user: AuthUser }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return { token: data.token, user: data.user };
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

  async getAttendance(accountId: string, termId?: string): Promise<AttendanceSummary> {
    const query = termId ? `?termId=${encodeURIComponent(termId)}` : '';
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
      body: JSON.stringify(params)
    });
    return data.batch;
  }
};
