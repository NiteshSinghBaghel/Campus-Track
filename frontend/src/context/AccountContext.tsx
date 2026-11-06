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

const LOCAL_ACCOUNTS_KEY = 'campustrack_accounts_cache';
const LOCAL_ACTIVE_ID_KEY = 'campustrack_active_account_id';
const LOCAL_USER_KEY = 'campustrack_auth_user';

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
      const cached = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [activeAccount, setActiveAccountState] = useState<StudentAccount | null>(() => {
    if (!hasToken) return null;
    try {
      const cachedAccounts = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      const activeId = localStorage.getItem(LOCAL_ACTIVE_ID_KEY);
      if (cachedAccounts) {
        const parsed: StudentAccount[] = JSON.parse(cachedAccounts);
        if (activeId) {
          const match = parsed.find(a => a.id === activeId);
          if (match) return match;
        }
        const primary = parsed.find(a => a.isPrimary);
        return primary || parsed[0] || null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const primaryAccount = accounts.find(a => a.isPrimary) || (accounts.length > 0 ? accounts[0] : null);

  const setActiveAccount = (account: StudentAccount) => {
    setActiveAccountState(account);
    try {
      localStorage.setItem(LOCAL_ACTIVE_ID_KEY, account.id);
    } catch {}
  };

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setAuthUser(res.user);
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(res.user));
    } catch {}
    await refreshAccounts();
  };

  const logout = () => {
    authStorage.removeToken();
    try {
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.removeItem(LOCAL_ACCOUNTS_KEY);
      localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
      localStorage.removeItem('campustrack_attendance_cache');
      localStorage.removeItem('campustrack_timetable_cache');
    } catch {}
    setAuthUser(null);
    setAccounts([]);
    setActiveAccountState(null);
  };

  const refreshAccounts = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setAccounts([]);
      setActiveAccountState(null);
      setAuthUser(null);
      setLoading(false);
      return;
    }

    try {
      const list = await api.getAccounts();
      const safeList = list || [];

      // If server returned empty list but we have cached accounts locally,
      // keep showing cached data (server may have restarted and lost accounts.json)
      if (safeList.length === 0) {
        const cachedRaw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
        if (cachedRaw) {
          const cached: StudentAccount[] = JSON.parse(cachedRaw);
          if (cached.length > 0) {
            console.warn('[AccountContext] Server returned 0 accounts but cache has', cached.length, '— keeping cached accounts.');
            // Don't overwrite state with empty; keep existing
            setLoading(false);
            return;
          }
        }
      }

      setAccounts(safeList);
      try {
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(safeList));
      } catch {}

      setActiveAccountState(prev => {
        if (safeList.length === 0) {
          localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
          return null;
        }
        const storedId = localStorage.getItem(LOCAL_ACTIVE_ID_KEY);
        if (storedId) {
          const foundStored = safeList.find(a => a.id === storedId);
          if (foundStored) return foundStored;
        }
        if (prev) {
          const found = safeList.find(a => a.id === prev.id);
          if (found) return found;
        }
        const primary = safeList.find(a => a.isPrimary);
        return primary || safeList[0];
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
    await api.removeAccount(id);
    await refreshAccounts();
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
