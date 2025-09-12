import { getUsers } from '@/lib/admin-actions'
import { createSupabaseUser, getSupabaseUsers } from '@/lib/supabase-admin-actions'

async function migrateJsonUsersToSupabase() {
  console.log('🔄 Starting migration from JSON to Supabase...\n')
  
  try {
    // Get existing JSON users
    console.log('1️⃣ Fetching JSON users...')
    const jsonUsers = await getUsers()
    console.log(`📄 Found ${jsonUsers.length} users in JSON file`)
    
    // Get existing Supabase users
    console.log('\n2️⃣ Fetching existing Supabase users...')
    const supabaseResult = await getSupabaseUsers()
    if (!supabaseResult.success) {
      console.log(`❌ Failed to fetch Supabase users: ${supabaseResult.error}`)
      return
    }
    
    const existingEmails = new Set(supabaseResult.users?.map(u => u.email) || [])
    console.log(`🗄️ Found ${existingEmails.size} existing users in Supabase`)
    
    // Migrate users that don't exist in Supabase
    console.log('\n3️⃣ Migrating users...')
    let migrated = 0
    let skipped = 0
    let failed = 0
    
    for (const user of jsonUsers) {
      if (existingEmails.has(user.email)) {
        console.log(`⏭️ Skipping ${user.email} - already exists in Supabase`)
        skipped++
        continue
      }
      
      // Create user in Supabase
      const result = await createSupabaseUser({
        name: user.name,
        email: user.email,
        password: user.password || 'temp123', // Use existing password or temporary
        role: user.role,
        modules: user.modules || [],
        status: user.status || 'Active'
      })
      
      if (result.success) {
        console.log(`✅ Migrated ${user.name} (${user.email})`)
        migrated++
      } else {
        console.log(`❌ Failed to migrate ${user.email}: ${result.error}`)
        failed++
      }
    }
    
    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successfully migrated: ${migrated}`)
    console.log(`⏭️ Skipped (already exists): ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📄 Total JSON users: ${jsonUsers.length}`)
    
    if (migrated > 0) {
      console.log('\n🎉 Migration completed! Users can now log in with their credentials.')
      console.log('💡 You can now safely switch to using Supabase for user management.')
    }
    
  } catch (error) {
    console.error('💥 Migration failed with error:', error)
  }
}

migrateJsonUsersToSupabase()
