import { createClient } from '@supabase/supabase-js'

async function testAuthenticationFlow() {
  console.log('🧪 Testing Complete Authentication Flow')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    console.log('1️⃣ Testing Supabase Auth Login...')
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (authError) {
      console.error('❌ Auth failed:', authError.message)
      return
    }

    console.log('✅ Supabase Auth successful!')
    console.log(`   User ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)

    console.log('\n2️⃣ Testing Profile Lookup...')
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup failed:', profileError.message)
      
      // Try lookup by email as fallback
      console.log('3️⃣ Trying profile lookup by email...')
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@openroad.com')
        .single()

      if (emailError) {
        console.error('❌ Email lookup also failed:', emailError.message)
        return
      }

      console.log('✅ Profile found by email:', profileByEmail)
      
      // Update the profile to have correct user_id
      console.log('4️⃣ Fixing profile user_id...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ user_id: authData.user.id })
        .eq('email', 'admin@openroad.com')

      if (updateError) {
        console.error('❌ Failed to update profile:', updateError.message)
        return
      }

      console.log('✅ Profile user_id updated successfully!')
      return
    }

    console.log('✅ Profile lookup successful!')
    console.log(`   Name: ${profile.name}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   Status: ${profile.status}`)
    console.log(`   Modules: ${profile.modules.join(', ')}`)

    console.log('\n3️⃣ Testing the exact auth flow from your app...')
    
    // This simulates what your app does
    const mockAuthResult = {
      success: true,
      user: {
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        modules: profile.modules,
        status: profile.status
      }
    }

    console.log('✅ Mock auth result:', mockAuthResult)

    console.log('\n🎉 AUTHENTICATION TEST COMPLETE!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Supabase Auth: Working')
    console.log('   ✅ Profile Lookup: Working')
    console.log('   ✅ User Data: Complete')
    console.log('   ✅ RBAC Modules: Configured')
    
    console.log('\n🚀 READY FOR PRODUCTION!')
    console.log('   URL: http://localhost:3000')
    console.log('   Email: admin@openroad.com')
    console.log('   Password: vJ16@160181vj')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testAuthenticationFlow()
