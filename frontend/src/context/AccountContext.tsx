import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentAccount } from '../types/index.js';
import { api } from '../services/api.js';

interface AccountContextType {
  accounts: StudentAccount[];
  activeAccount: StudentAccount | null;
  primaryAccount: StudentAccount | null;
  loading: boolean;
  setActiveAccount: (account: StudentAccount) => void;
  refreshAccounts: () => Promise<void>;
  syncAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const LOCAL_ACCOUNTS_KEY = 'campustrack_accounts_cache';
const LOCAL_ACTIVE_ID_KEY = 'campustrack_active_account_id';

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [loading, setLoading] = useState(accounts.length === 0);

  const primaryAccount = accounts.find(a => a.isPrimary) || (accounts.length > 0 ? accounts[0] : null);

  const setActiveAccount = (account: StudentAccount) => {
    setActiveAccountState(account);
    try {
      localStorage.setItem(LOCAL_ACTIVE_ID_KEY, account.id);
    } catch {}
  };

  const refreshAccounts = async () => {
    try {
      if (accounts.length === 0) setLoading(true);
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
    refreshAccounts();
  }, []);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        primaryAccount,
        loading,
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

