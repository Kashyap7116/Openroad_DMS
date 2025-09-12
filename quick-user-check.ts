import { getSupabaseUsers, getSupabaseAuthUsers } from '@/lib/supabase-admin-actions'

async function quickCheck() {
  console.log('🔍 Quick user check...')
  
  try {
    // Check profiles
    const profilesResult = await getSupabaseUsers()
    if (profilesResult.success) {
      console.log(`📊 Profiles: ${profilesResult.users?.length || 0}`)
      profilesResult.users?.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`)
      })
    } else {
      console.log(`❌ Profiles error: ${profilesResult.error}`)
    }
    
    // Check auth
    const authResult = await getSupabaseAuthUsers()
    if (authResult.success) {
      console.log(`📊 Auth users: ${authResult.users?.length || 0}`)
      authResult.users?.forEach(user => {
        console.log(`   - ${user.email}`)
      })
    } else {
      console.log(`❌ Auth error: ${authResult.error}`)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

quickCheck()
