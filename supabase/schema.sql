-- Campus Track Database Schema (Supabase PostgreSQL with RLS)
-- Target: D. Y. Patil International University (DYPIU)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Campus Track User)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Accounts Table (Multi-Account Management)
CREATE TABLE IF NOT EXISTS student_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    prn TEXT NOT NULL,
    email TEXT NOT NULL,
    encrypted_password TEXT,
    program TEXT,
    semester TEXT,
    institution TEXT DEFAULT 'DYPIU',
    is_primary BOOLEAN DEFAULT FALSE,
    connection_status TEXT DEFAULT 'DISCONNECTED' CHECK (connection_status IN ('CONNECTED', 'DISCONNECTED', 'EXPIRED', 'ERROR')),
    last_synced_at TIMESTAMPTZ,
    attendance_percentage NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, prn)
);

-- 3. Account Permissions Table (Explicit Consent & Delegation)
CREATE TABLE IF NOT EXISTS account_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    grantor_name TEXT NOT NULL,
    consent_granted BOOLEAN DEFAULT TRUE,
    consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
    allowed_operations TEXT[] DEFAULT ARRAY['ATTENDANCE_VIEW', 'ATTENDANCE_SUBMIT', 'TIMETABLE_VIEW'],
    revoked_at TIMESTAMPTZ
);

-- 4. ERP Connections Table (Session state & cookies)
CREATE TABLE IF NOT EXISTS erp_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID UNIQUE NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    base_url TEXT DEFAULT 'https://erp.dypiu.ac.in',
    session_data TEXT, -- Encrypted cookie jar
    session_expires_at TIMESTAMPTZ,
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    faculty_name TEXT,
    total_classes INTEGER DEFAULT 0,
    present_classes INTEGER DEFAULT 0,
    absent_classes INTEGER DEFAULT 0,
    percentage NUMERIC(5, 2) DEFAULT 0.00,
    semester TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_account_id, subject_code)
);

-- 6. Attendance Sessions Table (QR Scans)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scanned_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    qr_payload TEXT NOT NULL,
    session_token TEXT,
    subject_code TEXT,
    subject_name TEXT,
    faculty_name TEXT,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'IDENTIFIED' CHECK (status IN ('IDENTIFIED', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    faculty_name TEXT,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'EXCUSED')),
    erp_confirmation_ref TEXT,
    submission_timestamp TIMESTAMPTZ DEFAULT NOW(),
    verification_status TEXT DEFAULT 'CONFIRMED' CHECK (verification_status IN ('PENDING', 'CONFIRMED', 'VERIFICATION_REQUIRED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Attendance Submission Logs Table (One-Scan Group Audit)
CREATE TABLE IF NOT EXISTS attendance_submission_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    submission_time TIMESTAMPTZ DEFAULT NOW(),
    status_returned TEXT NOT NULL,
    response_payload JSONB,
    challenge_required BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- 9. Timetable Table
CREATE TABLE IF NOT EXISTS timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Monday
    subject_name TEXT NOT NULL,
    faculty_name TEXT,
    classroom TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Results Table
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    semester TEXT NOT NULL,
    exam_schedule_id TEXT,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    marks_obtained NUMERIC(5, 2),
    max_marks NUMERIC(5, 2),
    grade TEXT,
    sgpa NUMERIC(4, 2),
    cgpa NUMERIC(4, 2),
    status TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Sync Logs Table
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILURE')),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_submission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view and update their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Student Accounts Policies
CREATE POLICY "Users can manage their linked student accounts" ON student_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Attendance Sessions Policies
CREATE POLICY "Users can access their scanned attendance sessions" ON attendance_sessions
    FOR ALL USING (auth.uid() = scanned_by_user_id);

-- Attendance Records Policies
CREATE POLICY "Users can view attendance for their accounts" ON attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_accounts
            WHERE student_accounts.id = attendance_records.student_account_id
            AND student_accounts.user_id = auth.uid()
        )
    );

-- Audit Logs Policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

