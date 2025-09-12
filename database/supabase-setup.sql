-- ✅ COMPLETE SUPABASE SETUP for Openroad DMS
-- Run this entire script in your Supabase SQL Editor
-- PostgreSQL compliant and production-ready

-- =============================================================================
-- 1. CORE TABLES SETUP
-- =============================================================================

-- Profiles table (main user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    department TEXT
);

-- User sessions tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =============================================================================
-- 2. INDEXES for performance
-- =============================================================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start ON public.user_sessions(session_start);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "authenticated_users_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "authenticated_users_audit_logs" ON public.audit_logs;

-- Profiles policies
CREATE POLICY "authenticated_users_profiles" ON public.profiles
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- User sessions policies (users can see their own sessions)
CREATE POLICY "users_own_sessions" ON public.user_sessions
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
    );

-- Audit logs policies (admins can see all, users can see their own)
CREATE POLICY "audit_logs_access" ON public.audit_logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
    );

-- =============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user actions
CREATE OR REPLACE FUNCTION public.log_user_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, 
        action, 
        table_name, 
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, email, role, status, modules)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'Staff'),
        'Active',
        ARRAY['dashboard']::TEXT[]
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Don't fail user creation if profile creation fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track user sessions
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    -- End any existing active sessions for this user
    UPDATE public.user_sessions 
    SET session_end = NOW(), is_active = false 
    WHERE user_id = NEW.id AND is_active = true;
    
    -- Create new session
    INSERT INTO public.user_sessions (user_id, ip_address)
    VALUES (NEW.id, NULL); -- IP will be set from application
    
    -- Update last login time
    UPDATE public.profiles 
    SET last_login = NOW() 
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logging triggers
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_action();

-- User registration trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Function to check module access
CREATE OR REPLACE FUNCTION public.user_has_module_access(user_uuid UUID, module_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_uuid 
        AND status = 'Active'
        AND module_name = ANY(modules)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE user_id = user_uuid AND status = 'Active';
    
    RETURN COALESCE(user_role, 'Staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to setup admin user (safe to run multiple times)
CREATE OR REPLACE FUNCTION public.setup_admin_user()
RETURNS TEXT AS $$
DECLARE
    admin_user_id UUID;
    result_msg TEXT;
BEGIN
    -- Get admin user ID from auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@openroad.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert or update admin profile
        INSERT INTO public.profiles (user_id, name, email, role, status, modules)
        VALUES (
            admin_user_id,
            'Administrator',
            'admin@openroad.com',
            'Admin',
            'Active',
            ARRAY['admin', 'hr', 'finance', 'purchase', 'sales', 'reports']
        ) 
        ON CONFLICT (email) DO UPDATE SET
            user_id = admin_user_id,
            role = 'Admin',
            status = 'Active',
            modules = ARRAY['admin', 'hr', 'finance', 'purchase', 'sales', 'reports'],
            updated_at = NOW();
        
        result_msg := '✅ Admin profile created/updated successfully for user ID: ' || admin_user_id;
    ELSE
        result_msg := '❌ Admin user not found in auth.users. Please create the user first.';
    END IF;
    
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. DATA VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate role transitions
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only admins can change roles
    IF OLD.role != NEW.role AND NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'Admin'
    ) THEN
        RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for role validation
DROP TRIGGER IF EXISTS validate_profile_role_changes ON public.profiles;
CREATE TRIGGER validate_profile_role_changes
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_change();

-- =============================================================================
-- 8. SETUP COMPLETION
-- =============================================================================

-- Function to verify setup
CREATE OR REPLACE FUNCTION public.verify_setup()
RETURNS TABLE(
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check tables
    RETURN QUERY SELECT 
        'Tables'::TEXT as component,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
             THEN '✅ OK' ELSE '❌ MISSING' END as status,
        'Profiles table' as details;
    
    -- Check RLS
    RETURN QUERY SELECT 
        'RLS'::TEXT as component,
        CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true)
             THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status,
        'Row Level Security' as details;
    
    -- Check functions
    RETURN QUERY SELECT 
        'Functions'::TEXT as component,
        CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'setup_admin_user')
             THEN '✅ OK' ELSE '❌ MISSING' END as status,
        'Helper functions' as details;
    
    -- Check admin user
    RETURN QUERY SELECT 
        'Admin User'::TEXT as component,
        CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@openroad.com')
             THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
        'admin@openroad.com in auth.users' as details;
        
    -- Check admin profile
    RETURN QUERY SELECT 
        'Admin Profile'::TEXT as component,
        CASE WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@openroad.com')
             THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
        'Admin profile in profiles table' as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

/*
After running this script:

1. Verify setup:
   SELECT * FROM public.verify_setup();

2. Setup admin user (if exists in auth.users):
   SELECT public.setup_admin_user();

3. Test the setup:
   SELECT * FROM public.profiles WHERE email = 'admin@openroad.com';

4. Check module access:
   SELECT public.user_has_module_access(
     (SELECT user_id FROM public.profiles WHERE email = 'admin@openroad.com'),
     'admin'
   );
*/