import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentAccount, AuthUser } from '../types/index.js';
import { api, authStorage } from '../services/api.js';

interface AccountContextType {
  accounts: StudentAccount[];
  activeAccount: StudentAccount | null;
  primaryAccount: StudentAccount | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveAccount: (account: StudentAccount) => void;
  refreshAccounts: () => Promise<void>;
  syncAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'campustrack_auth_user';
const LOCAL_ACTIVE_ID_KEY = 'campustrack_active_account_id';

const getVaultKey = (userId?: string | null) => {
  return userId ? `campustrack_accounts_${userId}` : 'campustrack_accounts_cache';
};

// Old local/cloud records may be missing fields that the UI expects to be strings.
// Normalize at the API/cache boundary so a partial account cannot crash rendering.
const normalizeAccount = (value: unknown, index = 0): StudentAccount => {
  const account = value && typeof value === 'object'
    ? value as Partial<StudentAccount>
    : {};
  const validStatuses: StudentAccount['connectionStatus'][] = ['CONNECTED', 'DISCONNECTED', 'EXPIRED', 'ERROR'];

  return {
    id: typeof account.id === 'string' && account.id ? account.id : `unknown-account-${index}`,
    studentName: typeof account.studentName === 'string' && account.studentName.trim() ? account.studentName : 'Student',
    prn: typeof account.prn === 'string' ? account.prn : '',
    email: typeof account.email === 'string' ? account.email : '',
    program: typeof account.program === 'string' ? account.program : 'Program',
    semester: typeof account.semester === 'string' ? account.semester : 'Current',
    isPrimary: account.isPrimary === true,
    connectionStatus: validStatuses.includes(account.connectionStatus as StudentAccount['connectionStatus'])
      ? account.connectionStatus as StudentAccount['connectionStatus']
      : 'ERROR',
    lastSyncedAt: typeof account.lastSyncedAt === 'string' ? account.lastSyncedAt : undefined,
    attendancePercentage: typeof account.attendancePercentage === 'number' && Number.isFinite(account.attendancePercentage)
      ? account.attendancePercentage
      : 0,
    avatarUrl: typeof account.avatarUrl === 'string' ? account.avatarUrl : undefined
  };
};

const normalizeAccounts = (value: unknown): StudentAccount[] =>
  Array.isArray(value) ? value.map((account, index) => normalizeAccount(account, index)) : [];

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasToken = Boolean(authStorage.getToken());

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    if (!hasToken) return null;
    try {
      const cached = localStorage.getItem(LOCAL_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [accounts, setAccounts] = useState<StudentAccount[]>(() => {
    if (!hasToken) return [];
    try {
      const u = localStorage.getItem(LOCAL_USER_KEY);
      const uid = u ? JSON.parse(u)?.userId : null;
      // 1. Try user-specific vault key
      const cached = localStorage.getItem(getVaultKey(uid));
      if (cached) {
        const parsed = normalizeAccounts(JSON.parse(cached));
        if (parsed.length > 0) return parsed;
      }
      // 2. Fallback to generic cache key
      const generic = localStorage.getItem('campustrack_accounts_cache');
      if (generic) {
        const parsed = normalizeAccounts(JSON.parse(generic));
        if (parsed.length > 0) return parsed;
      }
      // 3. Fallback to primaryAccount stored inside authUser
      if (u) {
        const parsedUser = JSON.parse(u);
        if (parsedUser?.primaryAccount) {
          return [normalizeAccount(parsedUser.primaryAccount)];
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeAccount, setActiveAccountState] = useState<StudentAccount | null>(() => {
    if (!hasToken) return null;
    try {
      const u = localStorage.getItem(LOCAL_USER_KEY);
      const uid = u ? JSON.parse(u)?.userId : null;
      const cachedAccounts = localStorage.getItem(getVaultKey(uid)) || localStorage.getItem('campustrack_accounts_cache');
      const activeId = localStorage.getItem(LOCAL_ACTIVE_ID_KEY);
      if (cachedAccounts) {
        const parsed = normalizeAccounts(JSON.parse(cachedAccounts));
        if (activeId) {
          const match = parsed.find(a => a.id === activeId);
          if (match) return match;
        }
        const primary = parsed.find(a => a.isPrimary);
        return primary || parsed[0] || null;
      }
      if (u) {
        const parsedUser = JSON.parse(u);
        if (parsedUser?.primaryAccount) {
          return normalizeAccount(parsedUser.primaryAccount);
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    // Instant workspace ready: if user has a token AND already cached accounts/user, don't block the UI with full-screen spinner
    if (!hasToken) return false;
    try {
      const u = localStorage.getItem(LOCAL_USER_KEY);
      const uid = u ? JSON.parse(u)?.userId : null;
      const cached = localStorage.getItem(getVaultKey(uid)) || localStorage.getItem('campustrack_accounts_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return false; // Instant ready! Render dashboard immediately
        }
      }
      if (u) {
        const parsedUser = JSON.parse(u);
        if (parsedUser?.primaryAccount) {
          return false; // Instant ready via cached primary account!
        }
      }
    } catch {}
    return true; // only wait if first time with no cached accounts
  });

  const primaryAccount = accounts.find(a => a.isPrimary) || (accounts.length > 0 ? accounts[0] : null);

  const setActiveAccount = (account: StudentAccount) => {
    const normalized = normalizeAccount(account);
    setActiveAccountState(normalized);
    try {
      localStorage.setItem(LOCAL_ACTIVE_ID_KEY, normalized.id);
    } catch {}
  };

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setAuthUser(res.user);
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(res.user));
    } catch {}
    await refreshAccounts(res.user.userId);
  };

  const logout = () => {
    authStorage.removeToken();
    try {
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
      localStorage.removeItem('campustrack_attendance_cache');
      localStorage.removeItem('campustrack_timetable_cache');
    } catch {}
    setAuthUser(null);
    setAccounts([]);
    setActiveAccountState(null);
  };

  const refreshAccounts = async (explicitUserId?: string) => {
    const token = authStorage.getToken();
    if (!token) {
      setAccounts([]);
      setActiveAccountState(null);
      setAuthUser(null);
      setLoading(false);
      return;
    }

    const currentUserId = explicitUserId || authUser?.userId || (() => {
      try {
        const u = localStorage.getItem(LOCAL_USER_KEY);
        return u ? JSON.parse(u)?.userId : null;
      } catch {
        return null;
      }
    })();

    const vaultKey = getVaultKey(currentUserId);

    try {
      const list: StudentAccount[] = await api.getAccounts();
      const finalAccounts = normalizeAccounts(list);

      setAccounts(finalAccounts);
      try {
        localStorage.setItem(vaultKey, JSON.stringify(finalAccounts));
        localStorage.setItem('campustrack_accounts_cache', JSON.stringify(finalAccounts));
      } catch {}

      setActiveAccountState(prev => {
        if (finalAccounts.length === 0) {
          localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
          return null;
        }
        const storedId = localStorage.getItem(LOCAL_ACTIVE_ID_KEY);
        if (storedId) {
          const foundStored = finalAccounts.find(a => a.id === storedId);
          if (foundStored) return foundStored;
        }
        if (prev) {
          const found = finalAccounts.find(a => a.id === prev.id);
          if (found) return found;
        }
        const primary = finalAccounts.find(a => a.isPrimary);
        return primary || finalAccounts[0];
      });
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
      // If 401 or backend says invalid token/unauthorized, force logout immediately
      if (err?.message?.includes('401') || err?.message?.includes('Authentication required') || err?.message?.includes('Invalid or expired')) {
        logout();
      }
      // For other errors (network, server down), keep existing cached accounts visible
    } finally {
      setLoading(false);
    }
  };

  const syncAccount = async (id: string) => {
    await api.syncAccount(id);
    await refreshAccounts();
  };

  const removeAccount = async (id: string) => {
    // 1. Remove from local state immediately
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);

    // 2. Remove from localStorage cache immediately so refreshAccounts won't resurrect it
    const currentUserId = authUser?.userId || (() => {
      try {
        const u = localStorage.getItem(LOCAL_USER_KEY);
        return u ? JSON.parse(u)?.userId : null;
      } catch {
        return null;
      }
    })();
    const vaultKey = getVaultKey(currentUserId);
    try {
      localStorage.setItem(vaultKey, JSON.stringify(updated));
      localStorage.setItem('campustrack_accounts_cache', JSON.stringify(updated));
    } catch {}

    // Also update cached authUser if needed
    try {
      const u = localStorage.getItem(LOCAL_USER_KEY);
      if (u) {
        const parsedUser = JSON.parse(u);
        if (parsedUser?.primaryAccount?.id === id) {
          parsedUser.primaryAccount = updated.find(a => a.isPrimary) || updated[0] || null;
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(parsedUser));
        }
      }
    } catch {}

    // 3. Delete on backend and cloud
    try {
      await api.removeAccount(id);
    } catch (e) {
      console.warn('Backend delete failed, syncing state:', e);
    }

    // 4. Update active account if needed
    if (activeAccount?.id === id) {
      const nextActive = updated.find(a => a.isPrimary) || updated[0] || null;
      setActiveAccountState(nextActive);
      if (nextActive) {
        localStorage.setItem(LOCAL_ACTIVE_ID_KEY, nextActive.id);
      } else {
        localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
      }
    }
  };

  useEffect(() => {
    const token = authStorage.getToken();
    if (token) {
      refreshAccounts();
    } else {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = Boolean(authStorage.getToken());

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        primaryAccount,
        authUser,
        isAuthenticated,
        loading,
        login,
        logout,
        setActiveAccount,
        refreshAccounts,
        syncAccount,
        removeAccount
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccounts must be used within an AccountProvider');
  return context;
};
