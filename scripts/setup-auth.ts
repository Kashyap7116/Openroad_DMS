import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function setupSupabaseAuth() {
  console.log('🚀 Starting Supabase Authentication Setup...\n')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please ensure these are set in your .env.local:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL')
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.log('- SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // Step 1: Check connection
    console.log('1️⃣ Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase.auth.admin.listUsers()
    if (testError) {
      console.error('❌ Connection failed:', testError.message)
      return
    }
    console.log('✅ Connected to Supabase successfully')

    // Step 2: Check schema
    console.log('\n2️⃣ Checking database schema...')
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')

    if (!tables || tables.length === 0) {
      console.error('❌ Profiles table not found')
      console.log('📋 Please run this SQL in your Supabase SQL Editor:')
      console.log('https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
      console.log('\nCopy and paste the content from: database/supabase-schema.sql')
      return
    }
    console.log('✅ Profiles table exists')

    // Step 3: Read users from JSON
    console.log('\n3️⃣ Reading users from database/admin/users.json...')
    const usersJsonPath = join(process.cwd(), 'database', 'admin', 'users.json')
    let usersData: any[] = []
    
    try {
      const fileContent = readFileSync(usersJsonPath, 'utf8')
      usersData = JSON.parse(fileContent)
      console.log(`✅ Found ${usersData.length} users in JSON file`)
    } catch (error) {
      console.error('❌ Could not read users.json:', error)
      return
    }

    // Step 4: Migrate each user
    console.log('\n4️⃣ Migrating users to Supabase...')
    
    for (const userData of usersData) {
      console.log(`\n👤 Processing ${userData.email}...`)
      
      // Check if user exists in auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      let authUser = existingUsers.users.find(u => u.email === userData.email)

      if (!authUser) {
        console.log(`   Creating auth user...`)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            created_via: 'migration',
            name: userData.name
          }
        })

        if (createError) {
          console.error(`   ❌ Failed to create auth user: ${createError.message}`)
          continue
        }
        authUser = newUser.user
        console.log(`   ✅ Created auth user`)
      } else {
        console.log(`   ✅ Auth user already exists`)
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single()

      if (!existingProfile) {
        console.log(`   Creating profile...`)
        const profileData = {
          id: authUser.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: userData.status || 'active',
          modules: userData.modules || [],
          employee_id: userData.employeeId || null,
          department: userData.department || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])

        if (profileError) {
          console.error(`   ❌ Failed to create profile: ${profileError.message}`)
          continue
        }
        console.log(`   ✅ Created profile`)
      } else {
        console.log(`   ✅ Profile already exists`)
      }
    }

    // Step 5: Test admin login
    console.log('\n5️⃣ Testing admin login...')
    const adminUser = usersData.find(u => u.email === 'admin@openroad.com')
    
    if (adminUser) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: adminUser.email,
        password: adminUser.password
      })

      if (loginError) {
        console.error(`❌ Login test failed: ${loginError.message}`)
      } else {
        console.log('✅ Admin login test successful')
      }
    }

    console.log('\n🎉 Setup completed successfully!')
    console.log('\nYou can now:')
    console.log('1. Visit your application: http://localhost:3000')
    console.log('2. Login with: admin@openroad.com')
    console.log('3. Use the diagnostic page: /admin/auth-diagnostics')

  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
setupSupabaseAuth()
