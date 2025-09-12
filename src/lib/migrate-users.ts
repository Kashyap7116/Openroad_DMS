'use server'

import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@/lib/supabase/server'

interface LegacyUser {
  user_id: string
  name: string
  email: string
  role: string
  modules: string[]
  status: string
  created_at: string
  last_login?: string
  password: string
  image?: string
}

export async function migrateUsersToSupabase() {
  const supabase = await createClient()
  
  try {
    // Read legacy users from JSON file
    const usersFilePath = path.join(process.cwd(), 'database', 'admin', 'users.json')
    const fileContent = await fs.readFile(usersFilePath, 'utf-8')
    const legacyUsers: LegacyUser[] = JSON.parse(fileContent)
    
    const results = []
    
    for (const user of legacyUsers) {
      try {
        // Create auth user in Supabase
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password, // Use existing password
          email_confirm: true,
        })
        
        if (authError) {
          console.error(`Failed to create auth user for ${user.email}:`, authError)
          results.push({ email: user.email, success: false, error: authError.message })
          continue
        }
        
        if (!authData.user) {
          results.push({ email: user.email, success: false, error: 'No user data returned' })
          continue
        }
        
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            modules: user.modules,
            status: user.status,
            created_at: user.created_at,
            last_login: user.last_login,
            image: user.image,
            auth_user_id: authData.user.id,
          })
        
        if (profileError) {
          console.error(`Failed to create profile for ${user.email}:`, profileError)
          // Clean up the auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id)
          results.push({ email: user.email, success: false, error: profileError.message })
          continue
        }
        
        results.push({ email: user.email, success: true })
        
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error)
        results.push({ 
          email: user.email, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    return {
      success: true,
      message: `Migration completed. ${results.filter(r => r.success).length}/${results.length} users migrated successfully.`,
      results
    }
    
  } catch (error) {
    console.error('Migration error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    }
  }
}

export async function verifyMigration() {
  const supabase = await createClient()
  
  try {
    // Count users in auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      return { success: false, error: authError.message }
    }
    
    // Count profiles
    const { data: profiles, error: profileError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
    
    if (profileError) {
      return { success: false, error: profileError.message }
    }
    
    return {
      success: true,
      authUsers: authUsers.users.length,
      profiles: count || 0,
      profilesList: profiles
    }
    
  } catch (error) {
    console.error('Verification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
