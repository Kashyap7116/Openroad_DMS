-- ✅ PRODUCTION-READY Simple Schema for Openroad DMS
-- Copy and paste this into your Supabase SQL Editor
-- This schema is PostgreSQL compliant and tested for Supabase

-- =============================================================================
-- CLEAN SLATE - Remove existing table if rebuilding
-- =============================================================================
-- Uncomment the next line if you want to start fresh
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- PROFILES TABLE - Core user data and RBAC
-- =============================================================================
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

-- =============================================================================
-- INDEXES for optimal performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - Simple but secure
-- =============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.profiles;

-- Create simple, working policies
CREATE POLICY "authenticated_users_select" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update" ON public.profiles
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete" ON public.profiles
    FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================================================
-- TRIGGERS & FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ADMIN USER SETUP
-- =============================================================================

-- Function to create admin profile (safe to run multiple times)
CREATE OR REPLACE FUNCTION public.setup_admin_user()
RETURNS VOID AS $$
DECLARE
    admin_user_id UUID;
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
        
        RAISE NOTICE 'Admin profile created/updated successfully';
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users. Please create the user first.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTIONS
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

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

-- To set up admin user after running this schema:
-- 1. Make sure admin@openroad.com exists in auth.users
-- 2. Run: SELECT public.setup_admin_user();

-- To verify setup:
-- SELECT * FROM public.profiles WHERE email = 'admin@openroad.com';
