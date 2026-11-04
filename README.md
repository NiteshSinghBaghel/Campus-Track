# Campus Track — DYPIU Juno ERP Companion Platform

**University:** D. Y. Patil International University (DYPIU), Pune, Maharashtra, India  
**Official ERP Portal:** `https://erp.dypiu.ac.in`  
**Platform:** Multi-Account Student Management & One-Scan Group Attendance  

---

## 🚀 Features

- **Multi-Account Student Management**: Securely link your student account and friend accounts with explicit consent.
- **One-Scan Group Attendance**: Scan the faculty attendance QR once to coordinate verified submissions for all connected accounts.
- **Attendance Dashboard**: Detailed subject-wise breakdown, percentage bars, and lectures attended vs total.
- **Timetable & Daily Schedule**: Real-time lecture timetable with classroom locations and faculty details.
- **Examination Results**: View SGPA, CGPA, and course grades directly from the ERP.
- **Juno ERP Integration**: Modular `DYPIUJunoAdapter` with strict redirect validation, session priming, and cookie jar persistence.
- **Security & Privacy**: Zero plaintext password storage, AES-256-GCM encryption for stored tokens, and Supabase Row Level Security (RLS).
- **Progressive Web App (PWA)**: Responsive on Android, iOS, Windows, and macOS laptops.

---

## 🛠️ Quick Start

### 1. Start Backend Server
```bash
cd backend
npm install
npm run build
npm start
```
Runs on `http://localhost:5005`.

### 2. Start Frontend App
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:3000`.

---

## 📄 Documentation Directory

- [`docs/compatibility-report.md`](docs/compatibility-report.md): Technical comparison of MGM University vs. DYPIU Juno ERP implementations.
- [`docs/architecture.md`](docs/architecture.md): System architecture and data flow diagrams.
- [`docs/security.md`](docs/security.md): Encryption, RLS policies, and anti-bot verification rules.
- [`docs/integration.md`](docs/integration.md): Sequence diagrams and ERP authentication flow.
- [`docs/api-documentation.md`](docs/api-documentation.md): REST API endpoint reference.
- [`supabase/schema.sql`](supabase/schema.sql): PostgreSQL tables with Row Level Security.

