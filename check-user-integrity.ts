import { supabaseService } from '@/lib/supabase-service'

async function checkAndCleanUsers() {
  console.log('🔍 Checking user data integrity...\n')
  
  try {
    // Check Supabase Auth users
    console.log('1️⃣ Checking Supabase Auth users...')
    const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers()
    
    if (authError) {
      console.log(`❌ Failed to fetch auth users: ${authError.message}`)
      return
    }
    
    console.log(`📊 Found ${authUsers.users.length} users in Supabase Auth:`)
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`)
    })
    
    // Check profiles table
    console.log('\n2️⃣ Checking profiles table...')
    const { data: profiles, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
    
    if (profileError) {
      console.log(`❌ Failed to fetch profiles: ${profileError.message}`)
      return
    }
    
    console.log(`📊 Found ${profiles.length} users in profiles table:`)
    profiles.forEach(profile => {
      console.log(`   - ${profile.name} (${profile.email}) - User ID: ${profile.user_id}`)
    })
    
    // Check for orphaned profiles (profiles without corresponding auth users)
    console.log('\n3️⃣ Checking for orphaned profiles...')
    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const orphanedProfiles = profiles.filter(p => !authUserIds.has(p.user_id))
    
    if (orphanedProfiles.length > 0) {
      console.log(`⚠️ Found ${orphanedProfiles.length} orphaned profiles:`)
      orphanedProfiles.forEach(profile => {
        console.log(`   - ${profile.name} (${profile.email}) - Auth user missing`)
      })
      
      console.log('\n🧹 Cleaning up orphaned profiles...')
      for (const profile of orphanedProfiles) {
        const { error: deleteError } = await supabaseService
          .from('profiles')
          .delete()
          .eq('user_id', profile.user_id)
        
        if (deleteError) {
          console.log(`❌ Failed to delete profile ${profile.email}: ${deleteError.message}`)
        } else {
          console.log(`✅ Deleted orphaned profile: ${profile.email}`)
        }
      }
    } else {
      console.log('✅ No orphaned profiles found')
    }
    
    // Check for missing profiles (auth users without profiles)
    console.log('\n4️⃣ Checking for auth users without profiles...')
    const profileUserIds = new Set(profiles.map(p => p.user_id))
    const missingProfiles = authUsers.users.filter(u => !profileUserIds.has(u.id))
    
    if (missingProfiles.length > 0) {
      console.log(`⚠️ Found ${missingProfiles.length} auth users without profiles:`)
      missingProfiles.forEach(user => {
        console.log(`   - ${user.email} (Auth ID: ${user.id})`)
      })
      console.log('💡 These users will need profiles created manually')
    } else {
      console.log('✅ All auth users have corresponding profiles')
    }
    
    // Check for email duplicates in profiles
    console.log('\n5️⃣ Checking for email duplicates in profiles...')
    const emailCounts = {}
    profiles.forEach(profile => {
      emailCounts[profile.email] = (emailCounts[profile.email] || 0) + 1
    })
    
    const duplicateEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1)
    
    if (duplicateEmails.length > 0) {
      console.log(`⚠️ Found ${duplicateEmails.length} duplicate emails:`)
      duplicateEmails.forEach(([email, count]) => {
        console.log(`   - ${email} appears ${count} times`)
      })
      console.log('⚠️ These duplicates need to be resolved manually')
    } else {
      console.log('✅ No duplicate emails found')
    }
    
    console.log('\n🎉 User data integrity check completed!')
    
  } catch (error) {
    console.error('💥 Error during integrity check:', error)
  }
}

checkAndCleanUsers()
