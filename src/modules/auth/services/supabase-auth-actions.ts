"use server";

import { supabaseService } from "@/lib/supabase-service";
import { createClient } from "@/lib/supabase/server";
import { addLog } from "../../admin/services/admin-actions";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  modules: string[];
  status: string;
  created_at: string;
  last_login: string | null;
  image: string | null;
}

/**
 * Sign in with email and password using Supabase Auth
 */
export async function signInWithPassword(email: string, password: string) {
  // Validate inputs
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createClient();

  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Get user profile using service role to bypass RLS issues
      const { data: profile, error: profileError } = await supabaseService
        .from("profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (profileError || !profile) {
        // Sign out if no profile found
        await supabase.auth.signOut();
        return { success: false, error: "User profile not found or inactive" };
      }

      if (profile.status === "Inactive") {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            "This user account is inactive. Please contact an administrator.",
        };
      }

      // Update last login using service role
      await supabaseService
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("user_id", data.user.id);

      // Log the successful login
      await addLog({
        user_id: profile.user_id,
        user_name: profile.name,
        module: "Auth",
        action: "Login",
        status: "success",
      });

      return { success: true, user: profile };
    }

    return { success: false, error: "Authentication failed" };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  role: string = "Staff"
) {
  if (!email || !password || !name) {
    return { success: false, error: "Email, password, and name are required." };
  }

  const supabase = await createClient();

  try {
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Create user profile using service role
      const { error: profileError } = await supabaseService
        .from("profiles")
        .insert({
          user_id: data.user.id,
          name,
          email,
          role,
          modules: getDefaultModulesForRole(role),
          status: "Active",
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return { success: false, error: "Failed to create user profile" };
      }

      return {
        success: true,
        message:
          "User created successfully. Please check your email to verify your account.",
      };
    }

    return { success: false, error: "Failed to create user" };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient();

  try {
    // Get current user before signing out
    const user = await getCurrentUser();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the logout
    if (user) {
      await addLog({
        user_id: user.user_id,
        user_name: user.name,
        module: "Auth",
        action: "Logout",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Reset password for a user
 */
export async function resetPassword(email: string) {
  if (!email) {
    return { success: false, error: "Email is required." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "Password reset email sent. Please check your inbox.",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();

  try {
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    // Get user profile using service role to bypass RLS issues
    const { data: profile, error } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error || !profile) {
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Check if user has access to a specific module
 */
export async function hasModuleAccess(moduleName: string): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  // Admin has access to everything
  if (user.role === "Admin") {
    return true;
  }

  return user.modules.includes(moduleName);
}

/**
 * Get default modules for a role
 */
function getDefaultModulesForRole(role: string): string[] {
  switch (role) {
    case "Admin":
      return [
        "Dashboard",
        "Purchase",
        "Sales",
        "Finance",
        "Maintenance",
        "HR",
        "Reports",
        "Alerts",
        "Admin",
      ];
    case "Manager":
      return [
        "Dashboard",
        "Purchase",
        "Sales",
        "Finance",
        "Maintenance",
        "HR",
        "Reports",
        "Alerts",
      ];
    case "Staff":
      return ["Dashboard", "Purchase", "Sales", "Reports"];
    default:
      return ["Dashboard"];
  }
}

/**
 * Update user profile with optional image upload
 */
export async function updateUserProfile(
  updates: Partial<UserProfile>,
  imageFile?: File | null
) {
  if (!updates || typeof updates !== "object") {
    return { success: false, error: "Invalid updates provided" };
  }

  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    let finalUpdates = { ...updates };

    // Handle image upload if provided
    if (imageFile) {
      // Generate unique filename
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${currentUser.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.user_id}/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        return { success: false, error: "Failed to upload profile picture" };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

      finalUpdates.image = publicUrl;
    }

    // Update profile in database using service role to bypass RLS
    const { data, error } = await supabaseService
      .from("profiles")
      .update(finalUpdates)
      .eq("user_id", currentUser.user_id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return { success: false, error: error.message };
    }

    // Log the profile update
    try {
      await addLog({
        user_id: currentUser.user_id,
        user_name: currentUser.name,
        module: "Settings",
        action: "Updated profile",
        details: {
          updated_fields: Object.keys(finalUpdates),
        },
      });
    } catch (logError) {
      console.warn("Failed to log profile update:", logError);
    }

    return { success: true, user: data };
  } catch (error) {
    console.error("Update user profile error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// Legacy compatibility - keep the old function name but use new implementation
export const login = signInWithPassword;
export const logout = signOut;
