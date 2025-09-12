import { createClient } from '@supabase/supabase-js'

async function testLogin() {
  console.log('🧪 Testing admin login...')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    // Test auth login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (authError) {
      console.error('❌ Auth failed:', authError.message)
      return
    }

    console.log('✅ Auth successful for:', authData.user.email)

    // Test profile lookup
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'admin@openroad.com')
      .single()

    if (profileError) {
      console.error('❌ Profile lookup failed:', profileError.message)
      
      // Let's see what profiles exist
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
      
      console.log('Available profiles:', allProfiles)
      return
    }

    console.log('✅ Profile found:', profile)
    console.log('\n🎉 LOGIN TEST SUCCESSFUL!')
    console.log(`Welcome ${profile.name} (${profile.role})`)
    console.log(`Modules: ${profile.modules.join(', ')}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testLogin()
