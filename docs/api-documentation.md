# Campus Track Backend API Reference

**Base URL:** `http://localhost:5005` (or `/api` via frontend proxy)

---

## 1. System Endpoints

### `GET /health`
Returns system status and connectivity to DYPIU Juno ERP.

---

## 2. Accounts Endpoints

### `GET /api/accounts`
Lists all connected student accounts for the authenticated profile.

### `POST /api/accounts/link`
Links an authorized student account using DYPIU Juno credentials.
```json
{
  "username": "DYPIU2023001",
  "password": "your_juno_password",
  "grantorConsent": true,
  "isPrimary": true
}
```

### `POST /api/accounts/:id/sync`
Manually synchronizes the student's attendance records with the live ERP.

### `DELETE /api/accounts/:id`
Unlinks and securely removes a student account and its encrypted session tokens.

---

## 3. Attendance Endpoints

### `GET /api/attendance/:accountId`
Returns overall and subject-wise attendance statistics.

### `POST /api/attendance/one-scan`
Coordinates one-scan group attendance for selected connected accounts.
```json
{
  "qrPayload": "{\"sessionId\":\"DYPIU-SESS-987\",\"subjectCode\":\"CS301\"}",
  "targetAccountIds": ["acc-1", "acc-2"],
  "challengeResponses": {
    "acc-2": "7"
  }
}
```

### `GET /api/attendance/:accountId/timetable`
Returns today's lecture schedule, room locations, and faculty names.

### `GET /api/attendance/:accountId/results`
Returns exam results, semester SGPA, and cumulative CGPA.

