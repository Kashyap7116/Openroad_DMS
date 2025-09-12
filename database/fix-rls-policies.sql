-- ✅ EMERGENCY RLS POLICY FIX for Supabase
-- Run this if you're experiencing infinite recursion errors
-- PostgreSQL compliant for Supabase

-- =============================================================================
-- 1. CLEAN UP ALL PROBLEMATIC POLICIES
-- =============================================================================

-- Drop all existing policies that might cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_all_access" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_select" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_insert" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_update" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_delete" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_profiles" ON public.profiles;

-- =============================================================================
-- 2. CREATE SIMPLE, WORKING POLICIES
-- =============================================================================

-- Single policy for all operations (prevents infinite recursion)
CREATE POLICY "simple_authenticated_access" ON public.profiles
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- 3. ENSURE RLS IS ENABLED
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. VERIFY ADMIN PROFILE EXISTS WITH CORRECT USER_ID
-- =============================================================================

-- Check if admin profile exists and has correct user_id
DO $$
DECLARE
    admin_auth_id UUID;
    admin_profile_user_id UUID;
BEGIN
    -- Get admin user ID from auth.users
    SELECT id INTO admin_auth_id 
    FROM auth.users 
    WHERE email = 'admin@openroad.com';
    
    -- Get user_id from profiles table
    SELECT user_id INTO admin_profile_user_id 
    FROM public.profiles 
    WHERE email = 'admin@openroad.com';
    
    -- Report status
    IF admin_auth_id IS NULL THEN
        RAISE NOTICE '❌ Admin user not found in auth.users';
    ELSIF admin_profile_user_id IS NULL THEN
        RAISE NOTICE '❌ Admin profile not found in profiles table';
    ELSIF admin_auth_id != admin_profile_user_id THEN
        RAISE NOTICE '⚠️ Admin profile has wrong user_id. Fixing...';
        
        -- Fix the user_id
        UPDATE public.profiles 
        SET user_id = admin_auth_id,
            updated_at = NOW()
        WHERE email = 'admin@openroad.com';
        
        RAISE NOTICE '✅ Admin profile user_id updated successfully';
    ELSE
        RAISE NOTICE '✅ Admin profile exists with correct user_id';
    END IF;
END $$;

-- =============================================================================
-- 5. VERIFICATION QUERIES
-- =============================================================================

-- Show current profiles table structure
SELECT 
    'Table Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show RLS status
SELECT 
    'RLS Status' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Show current policies
SELECT 
    'Current Policies' as info,
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Show admin profile data
SELECT 
    'Admin Profile' as info,
    id,
    user_id,
    name,
    email,
    role,
    status,
    modules
FROM public.profiles 
WHERE email = 'admin@openroad.com';

-- =============================================================================
-- 6. TEST QUERIES (Run these to verify everything works)
-- =============================================================================

-- Test 1: Basic select (should work without errors)
-- SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Test 2: Check admin user specifically
-- SELECT * FROM public.profiles WHERE email = 'admin@openroad.com';

-- Test 3: Verify auth user exists
-- SELECT id, email, created_at FROM auth.users WHERE email = 'admin@openroad.com';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 RLS POLICY FIX COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test login at your application';
    RAISE NOTICE '2. If still having issues, check the verification queries above';
    RAISE NOTICE '3. Make sure admin@openroad.com exists in both auth.users and profiles tables';
END $$;
