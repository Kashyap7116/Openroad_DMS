import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase environment variables'
      })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let steps: string[] = []

    // Step 1: Check if profiles table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')

    if (!tables || tables.length === 0) {
      steps.push('❌ Profiles table does not exist - please run database/supabase-schema.sql first')
      return NextResponse.json({
        success: false,
        message: 'Database schema not set up',
        details: steps.join('\n')
      })
    }
    steps.push('✅ Profiles table exists')

    // Step 2: Check if user exists in auth
    const { data: users } = await supabase.auth.admin.listUsers()
    let authUser = users.users.find(u => u.email === email)

    if (!authUser) {
      steps.push(`⚠️ User ${email} not found in auth, creating...`)
      
      // Create auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          created_via: 'migration'
        }
      })

      if (createError) {
        steps.push(`❌ Failed to create auth user: ${createError.message}`)
        return NextResponse.json({
          success: false,
          message: 'Failed to create auth user',
          details: steps.join('\n')
        })
      }

      authUser = newUser.user
      steps.push(`✅ Created auth user: ${email}`)
    } else {
      steps.push(`✅ Auth user exists: ${email}`)
    }

    // Step 3: Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!existingProfile) {
      steps.push('⚠️ Profile record not found, creating...')

      // Read user data from JSON file
      const usersJsonPath = join(process.cwd(), 'database', 'admin', 'users.json')
      let userData = null
      
      try {
        const usersData = JSON.parse(readFileSync(usersJsonPath, 'utf8'))
        userData = usersData.find((u: any) => u.email === email)
      } catch (error) {
        steps.push('⚠️ Could not read users.json, using default profile data')
      }

      // Create profile with data from JSON or defaults
      const profileData = {
        id: authUser.id,
        email: email,
        name: userData?.name || 'Administrator',
        role: userData?.role || 'admin',
        status: userData?.status || 'active',
        modules: userData?.modules || ['admin', 'hr', 'finance', 'purchase', 'sales', 'reports'],
        employee_id: userData?.employeeId || null,
        department: userData?.department || 'Administration',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])

      if (profileError) {
        steps.push(`❌ Failed to create profile: ${profileError.message}`)
        return NextResponse.json({
          success: false,
          message: 'Failed to create profile',
          details: steps.join('\n')
        })
      }

      steps.push('✅ Created profile record')
    } else {
      steps.push('✅ Profile record exists')
    }

    // Step 4: Test login
    const { data: testAuth, error: testError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (testError) {
      steps.push(`❌ Login test failed: ${testError.message}`)
      return NextResponse.json({
        success: false,
        message: 'Authentication setup completed but login test failed',
        details: steps.join('\n')
      })
    }

    steps.push('✅ Login test successful')

    return NextResponse.json({
      success: true,
      message: 'Authentication issues fixed successfully!',
      details: `${steps.join('\n')}\n\n🎉 You can now log in with ${email}`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error fixing authentication issues',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
