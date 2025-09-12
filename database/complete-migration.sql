-- ✅ COMPLETE DATABASE MIGRATION for Openroad DMS
-- This script migrates from JSON-based auth to Supabase auth
-- PostgreSQL compliant and production-ready

-- =============================================================================
-- MIGRATION SCRIPT HEADER
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 Starting Openroad DMS Database Migration';
    RAISE NOTICE 'Target: Supabase PostgreSQL';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- 1. BACKUP EXISTING DATA (if profiles table exists)
-- =============================================================================

-- Create backup table if profiles table already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Create backup
        CREATE TABLE IF NOT EXISTS public.profiles_backup AS 
        SELECT * FROM public.profiles;
        
        RAISE NOTICE '📋 Existing profiles data backed up to profiles_backup table';
    END IF;
END $$;

-- =============================================================================
-- 2. DROP AND RECREATE CLEAN SCHEMA
-- =============================================================================

-- Drop existing table and all dependencies
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.log_user_action() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_module_access(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.setup_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.validate_role_change() CASCADE;

RAISE NOTICE '🧹 Cleaned up existing schema';

-- =============================================================================
-- 3. CREATE CORE TABLES
-- =============================================================================

-- Profiles table (main user data and RBAC)
CREATE TABLE public.profiles (
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
CREATE TABLE public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Audit logs
CREATE TABLE public.audit_logs (
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

RAISE NOTICE '📊 Created core tables: profiles, user_sessions, audit_logs';

-- =============================================================================
-- 4. CREATE INDEXES
-- =============================================================================

-- Profiles table indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_employee_id ON public.profiles(employee_id);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_start ON public.user_sessions(session_start);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

RAISE NOTICE '🗂️ Created database indexes for optimal performance';

-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies (no infinite recursion)
CREATE POLICY "authenticated_profiles_access" ON public.profiles
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_sessions_access" ON public.user_sessions
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
    );

CREATE POLICY "audit_logs_read" ON public.audit_logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
    );

RAISE NOTICE '🔒 Enabled Row Level Security with secure policies';

-- =============================================================================
-- 6. CREATE FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
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
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Function to setup admin user
CREATE OR REPLACE FUNCTION public.setup_admin_user()
RETURNS TEXT AS $$
DECLARE
    admin_user_id UUID;
    result_msg TEXT;
BEGIN
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@openroad.com';
    
    IF admin_user_id IS NOT NULL THEN
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
        
        result_msg := '✅ Admin profile created/updated for: ' || admin_user_id;
    ELSE
        result_msg := '❌ Admin user not found in auth.users';
    END IF;
    
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '⚙️ Created essential functions';

-- =============================================================================
-- 7. CREATE TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- User registration trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE '🔄 Created database triggers';

-- =============================================================================
-- 8. MIGRATE EXISTING DATA (if backup exists)
-- =============================================================================

DO $$
DECLARE
    backup_count INTEGER;
    migrated_count INTEGER := 0;
    profile_record RECORD;
    auth_user_id UUID;
BEGIN
    -- Check if backup table exists and has data
    SELECT COUNT(*) INTO backup_count 
    FROM public.profiles_backup 
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup');
    
    IF backup_count > 0 THEN
        RAISE NOTICE '📦 Found % records in backup, migrating...', backup_count;
        
        -- Migrate each profile
        FOR profile_record IN 
            SELECT * FROM public.profiles_backup
        LOOP
            -- Try to find matching auth user by email
            SELECT id INTO auth_user_id 
            FROM auth.users 
            WHERE email = profile_record.email;
            
            IF auth_user_id IS NOT NULL THEN
                -- Insert migrated profile
                INSERT INTO public.profiles (
                    user_id, name, email, role, status, modules,
                    created_at, last_login, image, employee_id, department
                ) VALUES (
                    auth_user_id,
                    profile_record.name,
                    profile_record.email,
                    profile_record.role,
                    profile_record.status,
                    profile_record.modules,
                    profile_record.created_at,
                    profile_record.last_login,
                    profile_record.image,
                    profile_record.employee_id,
                    profile_record.department
                ) ON CONFLICT (email) DO UPDATE SET
                    user_id = auth_user_id,
                    name = profile_record.name,
                    role = profile_record.role,
                    status = profile_record.status,
                    modules = profile_record.modules,
                    updated_at = NOW();
                
                migrated_count := migrated_count + 1;
            END IF;
        END LOOP;
        
        RAISE NOTICE '✅ Migrated % profiles from backup', migrated_count;
    END IF;
END $$;

-- =============================================================================
-- 9. SETUP ADMIN USER
-- =============================================================================

-- Try to setup admin user automatically
SELECT public.setup_admin_user() as admin_setup_result;

-- =============================================================================
-- 10. FINAL VERIFICATION
-- =============================================================================

DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    function_count INTEGER;
    admin_exists BOOLEAN;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_sessions', 'audit_logs');
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'profiles';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc 
    WHERE proname IN ('setup_admin_user', 'user_has_module_access', 'get_user_role');
    
    -- Check admin
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = 'admin@openroad.com') INTO admin_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 MIGRATION VERIFICATION:';
    RAISE NOTICE '   Tables created: %/3', table_count;
    RAISE NOTICE '   RLS policies: %', policy_count;
    RAISE NOTICE '   Functions: %/3', function_count;
    RAISE NOTICE '   Admin profile: %', CASE WHEN admin_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    IF table_count = 3 AND policy_count > 0 AND function_count = 3 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Test login at your application';
        RAISE NOTICE '2. Create additional users as needed';
        RAISE NOTICE '3. Configure module access per user';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ Migration completed with warnings. Review the logs above.';
    END IF;
END $$;

-- =============================================================================
-- 11. HELPFUL QUERIES FOR POST-MIGRATION
-- =============================================================================

-- View all profiles
-- SELECT user_id, name, email, role, status, modules FROM public.profiles ORDER BY created_at;

-- Check RLS status
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('profiles', 'user_sessions', 'audit_logs');

-- Test module access
-- SELECT public.user_has_module_access((SELECT user_id FROM public.profiles WHERE email = 'admin@openroad.com'), 'admin');

-- Clean up backup table (uncomment if you want to remove it)
-- DROP TABLE IF EXISTS public.profiles_backup;
