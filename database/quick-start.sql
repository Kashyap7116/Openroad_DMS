-- ✅ QUICK START - Run this first in Supabase SQL Editor
-- This is the minimal setup to get authentication working immediately

-- Clean up any existing profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
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

-- Create indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Enable RLS with simple policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_access" ON public.profiles
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Function to setup admin user
CREATE OR REPLACE FUNCTION public.setup_admin_user()
RETURNS TEXT AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@openroad.com';
    
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
        
        RETURN 'Admin profile created/updated successfully';
    ELSE
        RETURN 'Admin user not found in auth.users';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the setup
SELECT public.setup_admin_user();

-- Verify the setup
SELECT 
    'Setup Verification' as status,
    COUNT(*) as total_profiles
FROM public.profiles;

SELECT 
    'Admin Profile' as status,
    user_id,
    name,
    email,
    role,
    status,
    modules
FROM public.profiles 
WHERE email = 'admin@openroad.com';
