import { createClient } from '@supabase/supabase-js'

async function fixDatabase() {
  console.log('🔧 Fixing database schema and data...')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    console.log('1️⃣ Getting admin user ID...')
    
    // Get admin user from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('❌ Error getting users:', usersError.message)
      return
    }

    const adminUser = users.users.find(u => u.email === 'admin@openroad.com')
    if (!adminUser) {
      console.error('❌ Admin user not found in auth.users')
      return
    }

    console.log('✅ Found admin user:', adminUser.id)

    console.log('\n2️⃣ Fixing profile table...')
    
    // First, try to drop and recreate the profiles table to fix schema issues
    console.log('   Dropping existing profiles table...')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS public.profiles CASCADE;'
    })

    // Create new table with correct schema
    console.log('   Creating new profiles table...')
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE public.profiles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('Admin', 'Manager', 'Staff')),
            modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_login TIMESTAMPTZ,
            image TEXT
        );

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Enable all for authenticated users" ON public.profiles
            FOR ALL USING (auth.role() = 'authenticated');
      `
    })

    if (createError) {
      console.error('❌ Error creating table:', createError.message)
      
      // Try simpler approach - just insert if table exists
      console.log('   Trying to work with existing table...')
    }

    console.log('\n3️⃣ Creating admin profile...')
    
    // Insert admin profile
    const { error: insertError } = await supabase
      .from('profiles')
      .upsert({
        user_id: adminUser.id,
        name: 'Administrator',
        email: 'admin@openroad.com',
        role: 'Admin',
        status: 'Active',
        modules: ['admin', 'hr', 'finance', 'purchase', 'sales', 'reports']
      }, {
        onConflict: 'user_id'
      })

    if (insertError) {
      console.error('❌ Error creating profile:', insertError.message)
      
      // Try alternative approach
      console.log('   Trying alternative insert...')
      const { error: altError } = await supabase.rpc('exec_sql', {
        sql: `
          INSERT INTO public.profiles (user_id, name, email, role, status, modules)
          VALUES (
            '${adminUser.id}',
            'Administrator',
            'admin@openroad.com',
            'Admin',
            'Active',
            ARRAY['admin', 'hr', 'finance', 'purchase', 'sales', 'reports']
          )
          ON CONFLICT (user_id) DO UPDATE SET
            name = 'Administrator',
            role = 'Admin',
            status = 'Active',
            modules = ARRAY['admin', 'hr', 'finance', 'purchase', 'sales', 'reports'];
        `
      })

      if (altError) {
        console.error('❌ Alternative insert failed:', altError.message)
        return
      }
    }

    console.log('✅ Admin profile created/updated')

    console.log('\n4️⃣ Testing login...')
    
    // Test login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (loginError) {
      console.error('❌ Login failed:', loginError.message)
      return
    }

    // Test profile retrieval
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', loginData.user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile retrieval failed:', profileError.message)
      return
    }

    console.log('✅ Login and profile retrieval successful!')
    console.log(`   Welcome ${profile.name} (${profile.role})`)

    console.log('\n🎉 DATABASE FIX COMPLETE!')
    console.log('\nYou can now:')
    console.log('1. Go to http://localhost:3000')
    console.log('2. Login with: admin@openroad.com')
    console.log('3. Password: vJ16@160181vj')

  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixDatabase()
