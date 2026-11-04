# Campus Track: Security & Privacy Architecture

---

## 1. Zero Plaintext Credential Storage
- Plaintext student credentials are **never** stored in database tables or client-side storage (localStorage, sessionStorage, IndexedDB).
- When credentials are stored to support automatic session renewal for multi-account attendance, they are encrypted with **AES-256-GCM** using a rotating server-side master key (`ENCRYPTION_KEY`).
- Initialization vectors (IV) and authentication tags are stored alongside ciphertext in byte-level buffers.

## 2. Session Isolation & CSRF Prevention
- Every connected student account maintains its own dedicated in-memory `CookieJar`.
- Cookie headers (`JSESSIONID`, `__Host-JUNO_DEVICE`) are strictly isolated between accounts to prevent cross-account contamination.
- The Campus Track client interacts with the backend using signed JWTs.

## 3. Row Level Security (RLS) in Supabase
- Every database table (`profiles`, `student_accounts`, `attendance_records`, `audit_logs`) has RLS enabled.
- Access policies enforce:
  - Users can only read/write their own profiles (`auth.uid() = user_id`).
  - Users can only access student accounts linked to their profile.
  - Audit logs are append-only.

## 4. Anti-Bot and Human Verification Integrity
- Campus Track does not defeat, bypass, or auto-solve CAPTCHAs.
- When an arithmetic prompt or security question is returned during attendance submission, the raw challenge is passed to the client interface so the user solves it directly.
- Failed attempts or expired QR sessions are logged and flagged to prevent replay attacks.

