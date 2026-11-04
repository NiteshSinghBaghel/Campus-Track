import {
  StudentAccount,
  AttendanceSummary,
  TimetableSlot,
  GroupAttendanceBatchResponse
} from '../types/index.js';

// In production, VITE_API_BASE_URL points to Render backend (e.g. https://campus-track-backend.onrender.com)
// In local dev, we use the Vite proxy at /api -> http://127.0.0.1:5005
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

/**
 * Robust fetch wrapper that gracefully handles:
 * - HTML error responses (502, 503, 504 from Vite proxy or server)
 * - Network failures / backend down
 * - JSON parse errors
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error(
      'Backend server is not reachable. Please try again later.'
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
    // Response is HTML or plain text (e.g. 502/504 proxy error)
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
  async getAccounts(): Promise<StudentAccount[]> {
    try {
      const data = await request<{ success: boolean; accounts: StudentAccount[] }>(`${API_BASE}/accounts`);
      return data.accounts || [];
    } catch (err) {
      console.warn('Failed to fetch accounts:', err);
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
