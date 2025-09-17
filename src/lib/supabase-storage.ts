"use server";

import { createSupabaseServerClient } from "@/lib/supabase";

// Supabase storage configuration
const EMPLOYEE_FILES_BUCKET = "employee-files";

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  photo: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  id_proof: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  address_proof: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  education_cert: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  professional_cert: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
};

/**
 * Upload file to Supabase storage with structured folder organization
 * @param employeeId Employee ID for folder organization
 * @param fileType Type of document (photo, id_proof, etc.)
 * @param file File object to upload
 * @returns Upload result with public URL or error
 */
export async function uploadEmployeeFile(
  employeeId: string,
  fileType: keyof typeof ALLOWED_FILE_TYPES,
  file: File
): Promise<{
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();

    // Check if storage bucket exists first
    const { data: buckets, error: bucketError } =
      await supabase.storage.listBuckets();

    if (bucketError) {
      console.error("Error checking storage buckets:", bucketError);
      return {
        success: false,
        error: `Storage not available: ${bucketError.message}`,
      };
    }

    const bucketExists = buckets?.some(
      (bucket) => bucket.id === EMPLOYEE_FILES_BUCKET
    );

    if (!bucketExists) {
      console.error("Employee files storage bucket does not exist");
      return {
        success: false,
        error: `Storage bucket '${EMPLOYEE_FILES_BUCKET}' not found. Please create it in Supabase dashboard.`,
      };
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES[fileType]) {
      return { success: false, error: "Invalid file type" };
    }

    // Validate MIME type
    if (!ALLOWED_FILE_TYPES[fileType].includes(file.type)) {
      return {
        success: false,
        error: `Invalid file format for ${fileType}. Allowed: ${ALLOWED_FILE_TYPES[
          fileType
        ].join(", ")}`,
      };
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 50MB" };
    }

    // Generate structured file path: employees/{employee_id}/{file_type}/{timestamp}-{filename}
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop() || "unknown";
    const fileName = `${timestamp}-${employeeId}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;
    const filePath = `employees/${employeeId}/${fileType}/${fileName}`;

    // Convert File to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(EMPLOYEE_FILES_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(EMPLOYEE_FILES_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error("File upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete file from Supabase storage
 * @param filePath Full path to the file in storage
 * @returns Success status and error message if failed
 */
export async function deleteEmployeeFile(filePath: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();

    // Validate that path starts with 'employees/' for security
    if (!filePath.startsWith("employees/")) {
      return { success: false, error: "Invalid file path" };
    }

    const { error } = await supabase.storage
      .from(EMPLOYEE_FILES_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("Supabase storage delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("File delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Get public URL for a file in Supabase storage
 * @param filePath Full path to the file in storage
 * @returns Public URL or error
 */
export async function getEmployeeFileUrl(filePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();

    // Validate that path starts with 'employees/' for security
    if (!filePath.startsWith("employees/")) {
      return { success: false, error: "Invalid file path" };
    }

    const { data } = supabase.storage
      .from(EMPLOYEE_FILES_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: data.publicUrl,
    };
  } catch (error) {
    console.error("Get file URL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get URL",
    };
  }
}

/**
 * List all files for a specific employee
 * @param employeeId Employee ID to list files for
 * @returns List of files with metadata
 */
export async function listEmployeeFiles(employeeId: string): Promise<{
  success: boolean;
  files?: Array<{
    name: string;
    path: string;
    size: number;
    type: string;
    url: string;
    created_at: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.storage
      .from(EMPLOYEE_FILES_BUCKET)
      .list(`employees/${employeeId}`, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("List files error:", error);
      return { success: false, error: error.message };
    }

    const files =
      data?.map((file) => {
        const filePath = `employees/${employeeId}/${file.name}`;
        const { data: urlData } = supabase.storage
          .from(EMPLOYEE_FILES_BUCKET)
          .getPublicUrl(filePath);

        return {
          name: file.name,
          path: filePath,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || "unknown",
          url: urlData.publicUrl,
          created_at: file.created_at || "",
        };
      }) || [];

    return { success: true, files };
  } catch (error) {
    console.error("List files error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list files",
    };
  }
}
