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
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [accounts, setAccounts] = useState<StudentAccount[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [activeAccount, setActiveAccountState] = useState<StudentAccount | null>(() => {
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
    } catch {}
    setAuthUser(null);
    setAccounts([]);
    setActiveAccountState(null);
  };

  const refreshAccounts = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const list = await api.getAccounts();
      const safeList = list || [];
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
    } catch (err) {
      console.error('Failed to load accounts:', err);
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
