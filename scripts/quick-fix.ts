import { createClient } from '@supabase/supabase-js'

async function quickFix() {
  console.log('🔧 Quick Authentication Fix for admin@openroad.com\n')

  const supabase = createClient(
    'https://zdswsrmyrnixofacoocm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc3dzcm15cm5peG9mYWNvb2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5NTQ3OCwiZXhwIjoyMDczMDcxNDc4fQ.ULAws5hvZ0JE6QN0_XEzFtnMvV6ceOuk2Hc4i5Mh9fo'
  )

  try {
    // Step 1: Create profiles table if it doesn't exist
    console.log('1️⃣ Setting up profiles table...')
    
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          status TEXT NOT NULL DEFAULT 'active',
          modules TEXT[] NOT NULL DEFAULT ARRAY['admin', 'hr', 'finance', 'purchase', 'sales', 'reports'],
          employee_id TEXT,
          department TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Enable all access for authenticated users" ON public.profiles
          FOR ALL USING (true);
      `
    })

    if (createTableError) {
      console.log('Trying alternative table creation...')
      
      // Alternative: Direct table creation
      const { error: altError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (altError && altError.message.includes('relation "public.profiles" does not exist')) {
        console.log('❌ Profiles table does not exist and cannot be created automatically')
        console.log('\n📋 MANUAL STEP REQUIRED:')
        console.log('1. Go to: https://supabase.com/dashboard/project/zdswsrmyrnixofacoocm/sql')
        console.log('2. Run this SQL:')
        console.log(`
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  modules TEXT[] NOT NULL DEFAULT ARRAY['admin', 'hr', 'finance', 'purchase', 'sales', 'reports'],
  employee_id TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Enable all access for authenticated users" ON public.profiles
  FOR ALL USING (true);
        `)
        console.log('\n3. Then run this script again')
        return
      }
    }
    
    console.log('✅ Profiles table ready')

    // Step 2: Create auth user
    console.log('\n2️⃣ Creating admin user...')
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    let adminUser = existingUsers.users.find(u => u.email === 'admin@openroad.com')

    if (!adminUser) {
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: 'admin@openroad.com',
        password: 'vJ16@160181vj',
        email_confirm: true,
        user_metadata: {
          name: 'Administrator'
        }
      })

      if (createUserError) {
        console.error('❌ Failed to create user:', createUserError.message)
        return
      }
      
      adminUser = newUser.user
      console.log('✅ Created admin auth user')
    } else {
      console.log('✅ Admin auth user already exists')
    }

    // Step 3: Create profile
    console.log('\n3️⃣ Creating admin profile...')
    
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', adminUser.id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      // Check by email if user_id lookup failed
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@openroad.com')
        .single()
        
      if (profileByEmail) {
        console.log('✅ Admin profile already exists (found by email)')
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: adminUser.id,
            name: 'Administrator',
            email: 'admin@openroad.com',
            role: 'Admin',
            status: 'Active',
            modules: ['admin', 'hr', 'finance', 'purchase', 'sales', 'reports']
          }])

        if (profileError) {
          console.error('❌ Failed to create profile:', profileError.message)
          return
        }
        
        console.log('✅ Created admin profile')
      }
    } else if (existingProfile) {
      console.log('✅ Admin profile already exists')
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: adminUser.id,
          name: 'Administrator',
          email: 'admin@openroad.com',
          role: 'Admin',
          status: 'Active',
          modules: ['admin', 'hr', 'finance', 'purchase', 'sales', 'reports']
        }])

      if (profileError) {
        console.error('❌ Failed to create profile:', profileError.message)
        return
      }
      
      console.log('✅ Created admin profile')
    }

    // Step 4: Test login
    console.log('\n4️⃣ Testing login...')
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@openroad.com',
      password: 'vJ16@160181vj'
    })

    if (loginError) {
      console.error('❌ Login test failed:', loginError.message)
      return
    }

    console.log('✅ Login test successful!')

    console.log('\n🎉 SETUP COMPLETE!')
    console.log('\nYou can now:')
    console.log('1. Go to http://localhost:3000')
    console.log('2. Login with: admin@openroad.com')
    console.log('3. Password: vJ16@160181vj')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

quickFix()
