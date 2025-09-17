"use server";

import { supabaseService } from "@/lib/supabase-service";
import { addLog } from "@/modules/admin/services/admin-actions";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "./supabase-auth-actions";

export async function updateProfileAction(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }

    const name = formData.get("name") as string;
    const imageFile = formData.get("image") as File;

    if (!name) {
      return { success: false, error: "Name is required" };
    }

    let finalUpdates: any = { name };

    // Handle image upload if provided
    if (imageFile && imageFile.size > 0) {
      console.log(
        "Processing image upload:",
        imageFile.name,
        "Size:",
        imageFile.size
      );

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(imageFile.type)) {
        return {
          success: false,
          error:
            "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.",
        };
      }

      // Validate file size (5MB limit)
      if (imageFile.size > 5 * 1024 * 1024) {
        return {
          success: false,
          error:
            "File size too large. Please upload an image smaller than 5MB.",
        };
      }

      // Generate unique filename
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${currentUser.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.user_id}/${fileName}`;

      // Use service role client for storage operations to bypass RLS
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        };
      }

      console.log("Image uploaded successfully:", uploadData);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

      console.log("Public URL generated:", publicUrl);
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
    console.error("Update profile action error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
