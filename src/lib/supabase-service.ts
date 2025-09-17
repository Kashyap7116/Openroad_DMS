// Service role client for admin operations
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables when running in Node.js
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  config({ path: path.join(process.cwd(), '.env.local') })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client bypasses RLS
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
