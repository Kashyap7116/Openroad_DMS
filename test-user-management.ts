import { 
  createSupabaseUser, 
  updateSupabaseUser, 
  deleteSupabaseUser, 
  getSupabaseUsers,
  getSupabaseAuthUsers 
} from '@/lib/supabase-admin-actions'

async function testUserManagement() {
  console.log('🧪 Testing Supabase User Management Operations...\n')
  
  try {
    // Test 1: Get existing users
    console.log('1️⃣ Fetching existing users...')
    const existingUsers = await getSupabaseUsers()
    if (existingUsers.success) {
      console.log(`✅ Found ${existingUsers.users?.length || 0} existing users`)
      existingUsers.users?.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`)
      })
    } else {
      console.log(`❌ Failed to fetch users: ${existingUsers.error}`)
    }
    
    // Test 2: Get Supabase Auth users
    console.log('\n2️⃣ Fetching Supabase Auth users...')
    const authUsers = await getSupabaseAuthUsers()
    if (authUsers.success) {
      console.log(`✅ Found ${authUsers.users?.length || 0} auth users`)
      authUsers.users?.forEach(user => {
        console.log(`   - ${user.email} (Auth ID: ${user.id})`)
      })
    } else {
      console.log(`❌ Failed to fetch auth users: ${authUsers.error}`)
    }
    
    // Test 3: Create a test user
    console.log('\n3️⃣ Creating test user...')
    const testUserData = {
      name: 'Test User',
      email: 'test@openroad.com',
      password: 'test123',
      role: 'Staff',
      modules: ['Dashboard', 'Purchase'],
      status: 'Active' as const
    }
    
    const createResult = await createSupabaseUser(testUserData)
    if (createResult.success) {
      console.log(`✅ Created test user: ${createResult.user?.name}`)
      console.log(`   User ID: ${createResult.user?.user_id}`)
      
      // Test 4: Update the test user
      console.log('\n4️⃣ Updating test user...')
      const updateResult = await updateSupabaseUser(createResult.user!.user_id, {
        name: 'Updated Test User',
        modules: ['Dashboard', 'Purchase', 'Finance']
      })
      
      if (updateResult.success) {
        console.log(`✅ Updated test user: ${updateResult.user?.name}`)
        console.log(`   Modules: ${updateResult.user?.modules.join(', ')}`)
        
        // Test 5: Delete the test user
        console.log('\n5️⃣ Deleting test user...')
        const deleteResult = await deleteSupabaseUser(createResult.user!.user_id)
        
        if (deleteResult.success) {
          console.log('✅ Successfully deleted test user')
        } else {
          console.log(`❌ Failed to delete test user: ${deleteResult.error}`)
        }
      } else {
        console.log(`❌ Failed to update test user: ${updateResult.error}`)
      }
    } else {
      console.log(`❌ Failed to create test user: ${createResult.error}`)
    }
    
    console.log('\n🎉 User management test completed!')
    
  } catch (error) {
    console.error('💥 Test failed with error:', error)
  }
}

testUserManagement()
