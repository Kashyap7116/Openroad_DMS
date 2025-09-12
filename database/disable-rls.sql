-- EMERGENCY FIX: Disable RLS completely
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zdswsrmyrnixofacoocm/sql

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Test profile lookup
SELECT 
    user_id,
    name,
    email,
    role,
    status,
    modules
FROM public.profiles 
WHERE email = 'admin@openroad.com';

-- Success message
SELECT 'RLS DISABLED - Authentication should now work!' as status;
