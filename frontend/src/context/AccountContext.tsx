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

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<StudentAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const primaryAccount = accounts.find(a => a.isPrimary) || (accounts.length > 0 ? accounts[0] : null);

  const refreshAccounts = async () => {
    try {
      setLoading(true);
      const list = await api.getAccounts();
      setAccounts(list);
      if (list.length > 0) {
        // Retain current active account or select primary
        setActiveAccount(prev => {
          if (prev) {
            const found = list.find(a => a.id === prev.id);
            if (found) return found;
          }
          const primary = list.find(a => a.isPrimary);
          return primary || list[0];
        });
      } else {
        setActiveAccount(null);
      }
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

