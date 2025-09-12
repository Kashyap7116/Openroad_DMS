-- Check for duplicate emails in profiles table
-- Run this in Supabase SQL Editor if needed

-- 1. First, let's see what emails are duplicated
SELECT email, COUNT(*) as count
FROM public.profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. See all profiles to understand the data
SELECT id, user_id, name, email, role, created_at 
FROM public.profiles 
ORDER BY email, created_at;

-- 3. If you need to remove duplicates, keep the newest one for each email
-- (UNCOMMENT ONLY IF YOU NEED TO CLEAN UP DUPLICATES)
/*
DELETE FROM public.profiles 
WHERE id NOT IN (
    SELECT DISTINCT ON (email) id
    FROM public.profiles 
    ORDER BY email, created_at DESC
);
*/

-- 4. Check auth users
-- This query shows if there are auth users without profiles
-- (Note: This won't work in SQL editor as auth.users is managed by Supabase)
/*
SELECT au.email, au.id as auth_id, p.email as profile_email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;
*/
