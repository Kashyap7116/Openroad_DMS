import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing environment variables: ${missing.join(', ')}`,
        details: 'Check your .env.local file and ensure all Supabase variables are set'
      })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'

    return NextResponse.json({
      success: true,
      message: 'All environment variables are configured',
      details: `URL: ${url}\nAnon Key: ${anonKey}\nService Key: ${serviceKey}`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error checking environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
