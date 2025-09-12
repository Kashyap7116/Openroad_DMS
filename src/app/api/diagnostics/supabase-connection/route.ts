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

    // Test connection by trying to read from auth.users
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to connect to Supabase',
        details: error.message
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase',
      details: `Connected to project. Found ${data.users.length} auth users.`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error testing Supabase connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
