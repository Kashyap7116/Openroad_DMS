import { createClient } from '@supabase/supabase-js'

async function quickDatabaseFix() {
  console.log('🔧 Quick Database Fix...')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    console.log('1️⃣ Getting admin user...')
    const { data: users } = await supabase.auth.admin.listUsers()
    const adminUser = users.users.find(u => u.email === 'admin@openroad.com')
    
    if (!adminUser) {
      console.error('❌ Admin user not found')
      return
    }
    
    console.log('✅ Admin user ID:', adminUser.id)

    console.log('\n2️⃣ Checking current profiles...')
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('*')

    console.log('Current profiles:', existingProfiles)
    
    if (checkError) {
      console.log('Profile check error:', checkError.message)
    }

    console.log('\n3️⃣ Deleting existing admin profile...')
    // Delete existing profile by email
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', 'admin@openroad.com')

    if (deleteError) {
      console.log('Delete error (might be OK):', deleteError.message)
    }

    console.log('\n4️⃣ Creating new admin profile...')
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: adminUser.id,
        name: 'Administrator',
        email: 'admin@openroad.com',
        role: 'Admin',
        status: 'Active',
        modules: ['admin', 'hr', 'finance', 'purchase', 'sales', 'reports']
      })
      .select()

    if (insertError) {
      console.error('❌ Insert error:', insertError.message)
      return
    }

    console.log('✅ Profile created:', newProfile)

    console.log('\n5️⃣ Testing auth flow...')
    
    // Test full auth flow
    const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (authError) {
      console.error('❌ Auth error:', authError.message)
      return
    }

    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authResult.user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup error:', profileError.message)
      return
    }

    console.log('✅ AUTH FLOW SUCCESSFUL!')
    console.log(`   User: ${profileCheck.name}`)
    console.log(`   Role: ${profileCheck.role}`)
    console.log(`   Modules: ${profileCheck.modules.join(', ')}`)

    console.log('\n🎉 READY TO USE!')
    console.log('Go to http://localhost:3000 and login with:')
    console.log('Email: admin@openroad.com')
    console.log('Password: vJ16@160181vj')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

quickDatabaseFix()
