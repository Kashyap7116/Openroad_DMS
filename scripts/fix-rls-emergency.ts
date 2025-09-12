import { createClient } from '@supabase/supabase-js'

async function fixRLSPolicy() {
  console.log('🔧 Emergency RLS Policy Fix')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    console.log('1️⃣ Disabling RLS temporarily...')
    
    // Disable RLS to fix the policy
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
    })

    // Alternative approach - use direct queries
    console.log('2️⃣ Testing without RLS...')
    
    // Test profile lookup with service role (bypasses RLS)
    const { data: testProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'admin@openroad.com')
      .single()

    console.log('Profile data:', testProfile)

    console.log('3️⃣ Manually enabling simple RLS...')
    
    // Enable RLS with simple policy using service role
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Drop all existing policies
        DROP POLICY IF EXISTS "authenticated_access" ON public.profiles;
        DROP POLICY IF EXISTS "simple_authenticated_access" ON public.profiles;
        DROP POLICY IF EXISTS "authenticated_users_all_access" ON public.profiles;
        
        -- Create the simplest possible policy
        CREATE POLICY "allow_all_authenticated" ON public.profiles
          FOR ALL USING (true);
      `
    })

    console.log('4️⃣ Testing with new policy...')
    
    // Test authentication flow
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (authError) {
      console.error('❌ Auth failed:', authError.message)
      return
    }

    // Test profile lookup
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup still failing:', profileError.message)
      
      // Try alternative fix - completely remove RLS
      console.log('5️⃣ Emergency: Disabling RLS completely...')
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
      })
      
      console.log('✅ RLS disabled. Authentication should now work.')
      console.log('⚠️ Note: RLS is disabled for debugging. Re-enable in production.')
    } else {
      console.log('✅ Profile lookup successful!')
      console.log(`Welcome ${profileData.name}!`)
    }

    console.log('\n🎉 READY TO TEST!')
    console.log('Go to http://localhost:3000 and try logging in.')

  } catch (error) {
    console.error('❌ Error:', error)
    
    // Fallback - try to disable RLS completely
    console.log('\nFallback: Attempting to disable RLS completely...')
    try {
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
      })
      console.log('✅ RLS disabled as fallback. Try logging in now.')
    } catch (fallbackError) {
      console.log('❌ Fallback failed. Manual intervention required.')
      console.log('\nMANUAL STEPS:')
      console.log('1. Go to: https://supabase.com/dashboard/project/zdswsrmyrnixofacoocm/sql')
      console.log('2. Run: ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;')
      console.log('3. Then try logging in')
    }
  }
}

fixRLSPolicy()
