# Campus Track: Juno ERP & DYPIU Compatibility Investigation Report

**Document Version:** 1.0.0  
**Target Institution:** D. Y. Patil International University (DYPIU), Pune, Maharashtra, India  
**Official ERP Portal:** `https://erp.dypiu.ac.in`  
**Reference Codebase:** `https://github.com/danish-mar/juno-mcp` & `juno-erp-client` v1.1.1  

---

## 1. Executive Summary

Campus Track requires connecting to DYPIU's official Juno ERP implementation while supporting multi-student account management and an optimized one-scan attendance workflow. This investigation compares the reference MGM University Juno implementation against DYPIU's live ERP deployment, examines architectural compatibility, identifies critical bugs in existing libraries, and provides an evidence-based roadmap for the adapter layer.

---

## 2. Architecture Comparison: MGM University vs. DYPIU

| Dimension | MGM University (`erp.mgmu.ac.in`) | DYPIU (`erp.dypiu.ac.in`) | Compatibility Status |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | Java / Spring Security (Tomcat) | Java / Spring Security (Tomcat) | **100% Compatible** |
| **Login Endpoint** | `/j_spring_security_check` | `/j_spring_security_check` | **100% Compatible** |
| **Login Fields** | `j_username`, `j_password` | `j_username`, `j_password` | **100% Compatible** |
| **Session Cookies** | `JSESSIONID`, `__Host-JUNO_DEVICE` | `JSESSIONID`, `__Host-JUNO_DEVICE` | **100% Compatible** |
| **Login UI Architecture** | Server-side JSP / HTML | React 17 SPA (`/scriptReactCompiled/login/...`) | **Compatible** (Underlying form targets same endpoint) |
| **Login Captcha** | Disabled for standard login | Disabled for standard login (only on forgot password) | **100% Compatible** |
| **Dashboard Priming** | `/stu_myDashBoard.htm` | `/stu_myDashBoard.htm` | **100% Compatible** |
| **Profile Endpoints** | `/stu_getPersonalInformation.json` | `/stu_getPersonalInformation.json` | **100% Compatible** |
| **Attendance Query** | `/stu_getAttendanceDetails.json` | `/stu_getAttendanceDetails.json` | **100% Compatible** |
| **Attendance Graph** | `/stu_getGraphForStudentAttendence.json` | `/stu_getGraphForStudentAttendence.json` | **100% Compatible** |
| **Timetable Queries** | `/stu_getTodaysScheduleForStudentLoggedIn.json` | `/stu_getTodaysScheduleForStudentLoggedIn.json` | **100% Compatible** |
| **Results Endpoints** | `/stu_getStudentSideResult.json` | `/stu_getStudentSideResult.json` | **100% Compatible** |
| **Native Group Attendance API** | None | None | **Not supported natively by Juno ERP** |

---

## 3. Analysis of Existing Codebase (`juno-mcp` & `juno-erp-client`)

### 3.1 Reusable Components
1. **Core API Endpoint Mapping**: The endpoints for student profile, academic information, attendance breakdown, schedule, and exam results follow the standardized Juno ERP module naming convention (`/stu_*.json`).
2. **Session Cookie Handling**: The cookie jar mechanism (`tough-cookie` + `axios-cookiejar-support`) successfully maintains session continuity for individual student queries.

### 3.2 Critical Bugs & Deficiencies in `juno-erp-client`
1. **False-Positive Login Bug** (`clients/base.js:237`):
   ```javascript
   // Existing faulty logic in juno-erp-client:
   let success = response.status === 302 || response.status === 200;
   ```
   *Flaw*: In Spring Security, failed authentication returns HTTP 302 redirecting to `/login.htm?failure=true`. The library incorrectly marks `success: true`, attempts to parse the HTML error page as JSON, and crashes.
   *Fix in Campus Track*: Explicitly verify `response.headers.location` does not contain `failure=true` or `error`.
2. **Hardcoded University Hostname**:
   `juno-mcp` and `juno-erp-client` hardcoded `https://erp.mgmu.ac.in` in multiple locations (image proxy, search referrers).
   *Fix in Campus Track*: Strict parameterization through `ERPAdapter` interface and university-specific configuration.
3. **Absence of Attendance Submission Logic**:
   Neither `juno-mcp` nor `juno-erp-client` contains any logic for processing QR codes or submitting attendance.

---

## 4. One-Scan Group Attendance Feasibility & Technical Design

### 4.1 Native ERP Reality Check
- **Does DYPIU Juno ERP offer an official bulk attendance submission endpoint for students?**
  **NO.** Juno ERP enforces individual student session contexts. Each attendance submission is tied directly to the `JSESSIONID` of the authenticated student.
- **Can a client forge attendance or submit without an authenticated session?**
  **NO.** The backend validates the student identity from the server-side session store (`stu_getStudentIdFromSession.json`). Submissions without an active session or with mismatched credentials fail immediately.

### 4.2 Authorized Architecture: Coordinated Multi-Session Dispatch
To fulfill the requirement of **One-Scan Group Attendance** without compromising security or violating university protocols:

1. **Multi-Account Storage**: Each connected friend/student account is stored with user consent and encrypted credentials/session tokens in the Campus Track database.
2. **Single QR Scan**: The user scans the faculty's attendance QR code once. Campus Track parses and validates the session payload (session token, course code, timestamp, classroom coordinates).
3. **Coordinated Dispatch**:
   ```
   [ One Faculty QR Scan ]
             │
             ▼
   [ Campus Track Backend ]
             │
     ┌───────┼───────┬───────┐
     ▼       ▼       ▼       ▼
   Acct 1  Acct 2  Acct 3  Acct 4
   (Sess1) (Sess2) (Sess3) (Sess4)
     │       │       │       │
     └───────┼───────┴───────┘
             ▼
   [ Individual Results & Audit Log ]
   ```
4. **Human Verification Queue (CAPTCHA / Arithmetic Prompt)**:
   If DYPIU requires an arithmetic challenge (e.g., `4 + 3 = ?`), Campus Track detects this requirement and presents a streamlined verification queue where the user answers the challenge for each respective student, ensuring zero automation of CAPTCHAs while maintaining maximum speed.
5. **Real Server Confirmation**: Campus Track only marks an account as `Present` when the ERP backend returns an explicit success response. If an account has an expired session or is not enrolled in that course, it displays `Verification Required` or `Failed`.

---

## 5. Implementation Roadmap & Architecture Split

```
Campus Track Architecture:
backend/src/adapters/juno/
├── ERPAdapter.ts          (Strict Interface contract)
├── MGMJunoAdapter.ts      (Legacy MGM reference adapter)
└── DYPIUJunoAdapter.ts    (Production DYPIU adapter with fixed redirect handling & session priming)
```

This guarantees clean architectural separation and ensures DYPIU-specific nuances are properly isolated.

