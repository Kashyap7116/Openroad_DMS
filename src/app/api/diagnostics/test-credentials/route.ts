import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Try to sign in with the credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      // Check if user exists in auth but password is wrong
      const { data: users } = await supabase.auth.admin.listUsers()
      const userExists = users.users.find(u => u.email === email)
      
      return NextResponse.json({
        success: false,
        message: 'Authentication failed',
        details: userExists 
          ? `User ${email} exists in auth but password is incorrect or account is disabled`
          : `User ${email} does not exist in Supabase Auth. Error: ${authError.message}`
      })
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        message: 'Auth successful but profile not found',
        details: `User authenticated but no profile record exists. Profile error: ${profileError?.message || 'No profile found'}`
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials are valid and profile exists',
      details: `Successfully authenticated ${email} with role: ${profile.role}`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error testing credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
