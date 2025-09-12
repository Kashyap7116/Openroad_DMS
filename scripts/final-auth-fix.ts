import { createClient } from '@supabase/supabase-js'

async function finalAuthFix() {
  console.log('🔧 Final Authentication Fix - Using Corrected Schema')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    console.log('1️⃣ Checking admin user...')
    const { data: users } = await supabase.auth.admin.listUsers()
    const adminUser = users.users.find(u => u.email === 'admin@openroad.com')
    
    if (!adminUser) {
      console.error('❌ Admin user not found in auth.users')
      return
    }
    
    console.log('✅ Admin user found:', adminUser.id)

    console.log('\n2️⃣ Testing profile lookup with corrected schema...')
    
    // Test the exact query our auth actions use
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', adminUser.id)
      .single()

    if (profileError) {
      console.log('⚠️ Profile lookup error:', profileError.message)
      
      // Check if any profiles exist at all
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5)

      if (allError) {
        console.error('❌ Cannot access profiles table:', allError.message)
        console.log('\n📋 MANUAL ACTION REQUIRED:')
        console.log('1. Go to https://supabase.com/dashboard/project/zdswsrmyrnixofacoocm/sql')
        console.log('2. Copy and paste the content from: database/quick-start.sql')
        console.log('3. Click RUN to execute the script')
        return
      }

      console.log('Existing profiles:', allProfiles)
      return
    }

    if (!profile) {
      console.log('❌ No profile found for admin user')
      return
    }

    console.log('✅ Profile found:', profile)

    console.log('\n3️⃣ Testing full authentication flow...')
    
    // Test login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (authError) {
      console.error('❌ Auth failed:', authError.message)
      return
    }

    console.log('✅ Authentication successful!')

    // Test profile lookup after login
    const { data: profileAfterLogin, error: profileAfterError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (profileAfterError) {
      console.error('❌ Profile lookup after login failed:', profileAfterError.message)
      return
    }

    console.log('✅ Profile lookup after login successful!')
    console.log(`   Name: ${profileAfterLogin.name}`)
    console.log(`   Role: ${profileAfterLogin.role}`)
    console.log(`   Modules: ${profileAfterLogin.modules.join(', ')}`)

    console.log('\n🎉 AUTHENTICATION IS NOW WORKING!')
    console.log('\nYou can now:')
    console.log('1. Go to http://localhost:3000')
    console.log('2. Login with: admin@openroad.com')
    console.log('3. Password: vJ16@160181vj')
    console.log('4. Access all dashboard features')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

finalAuthFix()
