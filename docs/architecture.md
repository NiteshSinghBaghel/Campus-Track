# Campus Track: System Architecture & Technical Specifications

**Target Platform:** D. Y. Patil International University (DYPIU)  
**System Type:** Progressive Web Application (PWA) + RESTful Backend + Multi-Session ERP Adapter  

---

## 1. System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons │
│  PWA Service Worker + Camera Access (html5-qrcode)          │
└───────────────┬─────────────────────────────▲───────────────┘
                │                             │
       REST API │ (JSON)             SSE / WS │ Status Updates
                ▼                             │
┌─────────────────────────────────────────────┴───────────────┐
│                    Campus Track Backend                     │
│               Node.js + Express + TypeScript                │
├─────────────────────────────────────────────────────────────┤
│ • Authentication & JWT Service                              │
│ • Multi-Account Management Service                          │
│ • Attendance & QR Dispatch Engine                           │
│ • Encryption & Session Store (AES-256-GCM)                  │
│ • Audit Logging & Security Guardrails                       │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
     SQL / RLS  ▼                             ▼ HTTP / Cookies
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       Supabase Cloud         │    │     DYPIU Juno ERP Host      │
│  PostgreSQL with Row Level   │    │    https://erp.dypiu.ac.in   │
│  Security (RLS)              │    │  Spring Security + REST APIs │
└──────────────────────────────┘    └──────────────────────────────┘
```

---

## 2. Core Modules

### 2.1 Multi-Account Manager
- Primary student registers/logs in via Supabase Auth.
- Primary student can link secondary student accounts with explicit permission.
- Each linked account maintains its own isolated ERP session cookie jar and credentials encrypted with server-side master key (`AES-256-GCM`).
- Switching accounts changes active context without logging out secondary accounts.

### 2.2 ERP Adapter Layer (`backend/src/adapters/juno/`)
- `ERPAdapter`: Abstract contract defining all student operations (`authenticate`, `getStudentProfile`, `getAttendance`, `getTimetable`, `getResults`, `submitAttendance`, `logout`).
- `DYPIUJunoAdapter`: Production implementation targeting `https://erp.dypiu.ac.in` with robust redirect inspection, JSESSIONID persistence, and context priming.
- `MGMJunoAdapter`: Separate legacy adapter maintained for regression testing and compatibility benchmarking.

### 2.3 One-Scan Group Attendance Engine
- QR Scanner decodes faculty attendance token.
- Engine inspects all eligible connected accounts enrolled in the scanned class.
- Dispatches parallel or sequential HTTP requests over each account's isolated session.
- Intercepts challenges (arithmetic CAPTCHA or OTP) and presents an interactive verification modal.
- Logs full audit trail to database.

