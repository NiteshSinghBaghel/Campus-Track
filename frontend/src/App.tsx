import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccountProvider } from './context/AccountContext.js';
import { AppLayout } from './layouts/AppLayout.js';
import { Dashboard } from './pages/Dashboard.js';
import { AccountsPage } from './pages/AccountsPage.js';
import { ScannerPage } from './pages/ScannerPage.js';
import { AttendancePage } from './pages/AttendancePage.js';
import { TimetablePage } from './pages/TimetablePage.js';

export function App() {
  return (
    <AccountProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="scanner" element={<ScannerPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="timetable" element={<TimetablePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AccountProvider>
  );
}

export default App;

