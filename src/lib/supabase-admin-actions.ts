'use server'

import { supabaseService } from '@/lib/supabase-service'
import { addLog } from './admin-actions'
import { getCurrentUser } from './supabase-auth-actions'
import type { UserProfile } from './supabase-auth-actions'

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: string
  modules: string[]
  status: 'Active' | 'Inactive'
}

export interface UpdateUserData {
  name?: string
  email?: string
  password?: string
  role?: string
  modules?: string[]
  status?: 'Active' | 'Inactive'
}

export interface UserOperationResult {
  success: boolean
  error?: string
  user?: UserProfile
}

/**
 * Create a new user in Supabase Auth and profiles table
 */
export async function createSupabaseUser(userData: CreateUserData): Promise<UserOperationResult> {
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Check if email already exists in profiles table
    const { data: existingProfile, error: checkError } = await supabaseService
      .from('profiles')
      .select('email')
      .eq('email', userData.email)
      .single()

    if (existingProfile) {
      return { success: false, error: `User with email ${userData.email} already exists` }
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    })

    if (authError) {
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: 'Admin',
        action: `Failed to create auth user for ${userData.email}: ${authError.message}`
      })
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'No user data returned from Supabase Auth' }
    }

    try {
      // Step 2: Create profile record
      const profileData = {
        user_id: authData.user.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        modules: userData.modules,
        status: userData.status,
        created_at: new Date().toISOString(),
        last_login: null,
      }

      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (profileError) {
        // Rollback: Delete the auth user if profile creation fails
        await supabaseService.auth.admin.deleteUser(authData.user.id)
        
        await addLog({
          user_id: currentUser.user_id,
          user_name: currentUser.name,
          module: 'Admin',
          action: `Failed to create profile for ${userData.email}, rolled back auth user: ${profileError.message}`
        })
        
        return { success: false, error: `Profile creation failed: ${profileError.message}` }
      }

      // Step 3: Log successful creation
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: 'Admin',
        action: `Created new user: ${userData.name} (${userData.email}) with role ${userData.role}`
      })

      return { 
        success: true, 
        user: profile as UserProfile 
      }

    } catch (profileError) {
      // Rollback: Delete the auth user if any step fails
      await supabaseService.auth.admin.deleteUser(authData.user.id)
      
      const errorMessage = profileError instanceof Error ? profileError.message : 'Unknown error'
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: 'Admin',
        action: `Failed to create user ${userData.email}, rolled back: ${errorMessage}`
      })
      
      return { success: false, error: `User creation failed: ${errorMessage}` }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await addLog({
      user_id: currentUser.user_id,
      user_name: currentUser.name,
      module: 'Admin',
      action: `Error creating user ${userData.email}: ${errorMessage}`
    })
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Update an existing user in Supabase Auth and profiles table
 */
export async function updateSupabaseUser(userId: string, updates: UpdateUserData): Promise<UserOperationResult> {
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Step 1: Get the current user profile to get auth_user_id
    const { data: existingProfile, error: fetchError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingProfile) {
      return { success: false, error: 'User not found' }
    }

    // Step 2: Update Supabase Auth user if email or password changed
    if (updates.email || updates.password) {
      const authUpdates: any = {}
      if (updates.email) authUpdates.email = updates.email
      if (updates.password) authUpdates.password = updates.password

      const { error: authError } = await supabaseService.auth.admin.updateUserById(
        existingProfile.user_id,
        authUpdates
      )

      if (authError) {
        await addLog({
          user_id: currentUser.user_id,
          user_name: currentUser.name,
          module: 'Admin',
          action: `Failed to update auth data for user ${existingProfile.email}: ${authError.message}`
        })
        return { success: false, error: `Auth update failed: ${authError.message}` }
      }
    }

    // Step 3: Update profile table
    const profileUpdates: any = {}
    if (updates.name !== undefined) profileUpdates.name = updates.name
    if (updates.email !== undefined) profileUpdates.email = updates.email
    if (updates.role !== undefined) profileUpdates.role = updates.role
    if (updates.modules !== undefined) profileUpdates.modules = updates.modules
    if (updates.status !== undefined) profileUpdates.status = updates.status

    const { data: updatedProfile, error: profileError } = await supabaseService
      .from('profiles')
      .update(profileUpdates)
      .eq('user_id', userId)
      .select()
      .single()

    if (profileError) {
      // If profile update fails, we should ideally rollback auth changes
      // but Supabase doesn't provide easy rollback for auth updates
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: 'Admin',
        action: `Failed to update profile for user ${existingProfile.email}: ${profileError.message}`
      })
      return { success: false, error: `Profile update failed: ${profileError.message}` }
    }

    // Step 4: Log successful update
    const updatedFields = Object.keys(updates).join(', ')
    await addLog({
      user_id: currentUser.user_id,
      user_name: currentUser.name,
      module: 'Admin',
      action: `Updated user ${existingProfile.name} (${existingProfile.email}): ${updatedFields}`
    })

    return { 
      success: true, 
      user: updatedProfile as UserProfile 
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await addLog({
      user_id: currentUser.user_id,
      user_name: currentUser.name,
      module: 'Admin',
      action: `Error updating user ${userId}: ${errorMessage}`
    })
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete a user from Supabase Auth and all related tables
 */
export async function deleteSupabaseUser(userId: string): Promise<UserOperationResult> {
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Step 1: Get the user profile first for logging
    const { data: existingProfile, error: fetchError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingProfile) {
      return { success: false, error: 'User not found' }
    }

    // Step 2: Delete from Supabase Auth (this should cascade delete related records)
    const { error: authError } = await supabaseService.auth.admin.deleteUser(existingProfile.user_id)

    if (authError) {
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: 'Admin',
        action: `Failed to delete auth user ${existingProfile.name} (${existingProfile.email}): ${authError.message}`
      })
      return { success: false, error: `Auth deletion failed: ${authError.message}` }
    }

    // Step 3: Delete from profiles table (in case cascading doesn't work)
    const { error: profileError } = await supabaseService
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      // Log the error but don't fail the operation since auth user is already deleted
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: 'Admin',
        action: `Warning: Failed to delete profile for ${existingProfile.name}: ${profileError.message}`
      })
    }

    // Step 4: Log successful deletion
    await addLog({
      user_id: currentUser.user_id,
      user_name: currentUser.name,
      module: 'Admin',
      action: `Deleted user: ${existingProfile.name} (${existingProfile.email})`
    })

    return { success: true }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await addLog({
      user_id: currentUser.user_id,
      user_name: currentUser.name,
      module: 'Admin',
      action: `Error deleting user ${userId}: ${errorMessage}`
    })
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Get all users from Supabase profiles table
 */
export async function getSupabaseUsers(): Promise<{ success: boolean; users?: UserProfile[]; error?: string }> {
  try {
    const { data: users, error } = await supabaseService
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, users: users as UserProfile[] }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

/**
 * Get users from Supabase Auth dashboard for comparison
 */
export async function getSupabaseAuthUsers(): Promise<{ success: boolean; users?: any[]; error?: string }> {
  try {
    const { data, error } = await supabaseService.auth.admin.listUsers()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, users: data.users }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}
