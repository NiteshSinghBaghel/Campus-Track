import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccountProvider, useAccounts } from './context/AccountContext.js';
import { AppLayout } from './layouts/AppLayout.js';
import { Dashboard } from './pages/Dashboard.js';
import { AccountsPage } from './pages/AccountsPage.js';
import { ScannerPage } from './pages/ScannerPage.js';
import { AttendancePage } from './pages/AttendancePage.js';
import { TimetablePage } from './pages/TimetablePage.js';
import { LoginPage } from './pages/LoginPage.js';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAccounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-white rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading student workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

const LoginRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAccounts();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
};

export function App() {
  return (
    <AccountProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="scanner" element={<ScannerPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="timetable" element={<TimetablePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AccountProvider>
  );
}

export default App;

