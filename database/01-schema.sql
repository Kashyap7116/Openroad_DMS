-- =============================================================================
-- OPENROAD DMS - DATABASE SCHEMA
-- Complete table definitions and indexes
-- Version: 2.0
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- 1. AUTHENTICATION & USER MANAGEMENT
-- =============================================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('Admin', 'Manager', 'Staff')),
    modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    image TEXT,
    employee_id TEXT,
    department TEXT,
    version INTEGER DEFAULT 1
);

-- User sessions tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated'))
);

-- =============================================================================
-- 2. REFERENCE DATA
-- =============================================================================

-- Countries reference table
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone_code VARCHAR(10),
    currency VARCHAR(3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_employee_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. HUMAN RESOURCES
-- =============================================================================

-- Employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    nationality TEXT NOT NULL,
    department TEXT,
    position TEXT,
    hire_date DATE,
    salary DECIMAL(12,2),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Terminated')),
    documents JSONB DEFAULT '[]'::jsonb,
    personal_info JSONB DEFAULT '{}'::jsonb,
    employment_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1
);

-- Attendance records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status TEXT DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Half Day', 'Late', 'Holiday', 'Leave')),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(employee_id, date)
);

-- Payroll records
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL,
    overtime_amount DECIMAL(12,2) DEFAULT 0,
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Paid')),
    payment_date DATE,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1
);

-- Holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT DEFAULT 'Public' CHECK (type IN ('Public', 'Company', 'Religious')),
    description TEXT,
    country_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, country_code)
);

-- =============================================================================
-- 4. VEHICLE MANAGEMENT
-- =============================================================================

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    license_plate TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    date DATE NOT NULL,
    seller TEXT,
    purchase_price DECIMAL(15,2),
    final_price DECIMAL(15,2),
    payment_type TEXT,
    status TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Completed', 'Sold')),
    full_data JSONB NOT NULL,
    sale_details JSONB,
    maintenance_history JSONB[] DEFAULT ARRAY[]::JSONB[],
    financial_history JSONB[] DEFAULT ARRAY[]::JSONB[],
    licence_history JSONB[] DEFAULT ARRAY[]::JSONB[],
    bonus_history JSONB[] DEFAULT ARRAY[]::JSONB[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1
);

-- Maintenance records
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL,
    cost DECIMAL(12,2),
    description TEXT,
    mechanic TEXT,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Scheduled', 'In Progress', 'Completed')),
    next_service_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- 5. FINANCIAL MANAGEMENT
-- =============================================================================

-- Financial records
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Income', 'Expense', 'Transfer')),
    category TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    account TEXT,
    reference_id TEXT,
    reference_type TEXT,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1
);

-- Office expenses
CREATE TABLE IF NOT EXISTS public.office_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    receipt_number TEXT,
    approved_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- 6. SALES MANAGEMENT
-- =============================================================================

-- Sales records
CREATE TABLE IF NOT EXISTS public.sales_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id TEXT REFERENCES public.vehicles(id),
    sale_date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT,
    sale_price DECIMAL(15,2) NOT NULL,
    commission DECIMAL(12,2) DEFAULT 0,
    salesperson_id UUID REFERENCES public.employees(id),
    payment_method TEXT,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1
);

-- =============================================================================
-- 7. SYSTEM LOGS AND AUDIT
-- =============================================================================

-- Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- System logs
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    source TEXT
);

-- =============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_nationality ON public.employees(nationality);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_date ON public.vehicles(date);

-- Financial records indexes
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON public.financial_records(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON public.financial_records(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON public.financial_records(category);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_name ON public.activity_logs(table_name);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.employees IS 'Employee management with nationality-based IDs';
COMMENT ON TABLE public.vehicles IS 'Vehicle inventory and management';
COMMENT ON TABLE public.financial_records IS 'All financial transactions';
COMMENT ON TABLE public.activity_logs IS 'System audit trail';