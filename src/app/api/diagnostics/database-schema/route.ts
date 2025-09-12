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

    // Check if profiles table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')

    if (tablesError) {
      return NextResponse.json({
        success: false,
        message: 'Error checking database schema',
        details: tablesError.message
      })
    }

    if (!tables || tables.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Profiles table does not exist',
        details: 'Run the SQL script from database/supabase-schema.sql in your Supabase SQL Editor'
      })
    }

    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')

    return NextResponse.json({
      success: true,
      message: 'Profiles table exists',
      details: 'Database schema is properly configured'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error checking database schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
