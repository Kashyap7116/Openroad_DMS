import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
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

    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      return NextResponse.json({
        success: false,
        message: 'Error checking auth users',
        details: authError.message
      })
    }

    // Check for admin user
    const adminUser = authUsers.users.find(user => user.email === 'admin@openroad.com')

    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    let profileDetails = ''
    if (profilesError) {
      profileDetails = `Profiles table error: ${profilesError.message}`
    } else {
      profileDetails = `Found ${profiles?.length || 0} profiles in database`
    }

    const hasUsers = authUsers.users.length > 0
    const details = `Auth users: ${authUsers.users.length}\nAdmin user exists: ${adminUser ? 'Yes' : 'No'}\n${profileDetails}`

    return NextResponse.json({
      success: true,
      hasUsers,
      message: hasUsers ? 'Found existing users' : 'No users found in Supabase',
      details
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error checking existing users',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
