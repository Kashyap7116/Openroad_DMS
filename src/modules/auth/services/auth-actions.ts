"use server";

import type { UserRecord } from "@/app/(dashboard)/admin/users/page";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import sanitize from "sanitize-filename";
import { addLog } from "../../admin/services/admin-actions";
import { handleAndLogApiError } from "../../shared/utils/utils";

const adminUsersFilePath = path.join(
  process.cwd(),
  "database",
  "admin",
  "users.json"
);
const profilePicturesDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "profile_pictures"
);

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Validates user credentials against the users.json file.
 * @param email The user's email.
 * @param password The user's password.
 * @returns An object indicating success or failure.
 */
export async function login(email?: string, password?: string) {
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    const fileContent = await fs.readFile(adminUsersFilePath, "utf-8");
    const users: UserRecord[] = JSON.parse(fileContent);

    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    if (user.status === "Inactive") {
      return {
        success: false,
        error:
          "This user account is inactive. Please contact an administrator.",
      };
    }

    // IMPORTANT: In a real-world app, passwords should be hashed.
    // This is a plaintext comparison for demonstration purposes.
    if (user.password === password) {
      // This is a simplified "session" for the prototype
      process.env.CURRENT_USER_EMAIL = user.email;
      await addLog({
        user_id: user.user_id,
        user_name: user.name,
        module: "Auth",
        action: "Login",
        status: "success",
      });
      return { success: true };
    } else {
      await addLog({
        user_id: user.user_id,
        user_name: user.name,
        module: "Auth",
        action: "Login",
        status: "failure",
        details: { reason: "Invalid password" },
      });
      return { success: false, error: "Invalid email or password." };
    }
  } catch (error) {
    return await handleAndLogApiError(error, `login attempt for ${email}`);
  }
}

/**
 * Clears the current user's session data and redirects to the login page.
 */
export async function logout() {
  const user = await getCurrentUser();
  if (user) {
    await addLog({
      user_id: user.user_id,
      user_name: user.name,
      module: "Auth",
      action: "Logout",
    });
  }
  process.env.CURRENT_USER_EMAIL = "";
  redirect("/");
}

/**
 * Retrieves the currently logged-in user's data.
 * For this prototype, it uses an environment variable set during login.
 * In a real app, this would be based on a secure session or token.
 * @returns The user record object, or null if not found.
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const userEmail = process.env.CURRENT_USER_EMAIL;
  if (!userEmail) return null;

  try {
    const fileContent = await fs.readFile(adminUsersFilePath, "utf-8");
    const users: UserRecord[] = JSON.parse(fileContent);
    const user = users.find(
      (u) => u.email.toLowerCase() === userEmail.toLowerCase()
    );
    return user || null;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Updates a user's name and optionally their profile picture.
 * @param email The email of the user to update.
 * @param newName The new name for the user.
 * @param newImageFile The new profile picture file to upload.
 * @returns An object indicating success or failure, and the updated user data.
 */
export async function updateUser(
  email: string,
  newName: string,
  newImageFile: File | null
) {
  try {
    const fileContent = await fs.readFile(adminUsersFilePath, "utf-8");
    let users: UserRecord[] = JSON.parse(fileContent);
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (userIndex === -1) {
      return { success: false, error: "User not found." };
    }

    const userToUpdate = users[userIndex];
    let changes: string[] = [];

    // Update name
    if (userToUpdate.name !== newName) {
      changes.push(`name to '${newName}'`);
      userToUpdate.name = newName;
    }

    // Update profile picture if a new one is provided
    if (newImageFile) {
      await ensureDirectoryExists(profilePicturesDir);
      // Sanitize filename using the sanitize-filename package
      let sanitizedFileName = sanitize(newImageFile.name);
      if (!sanitizedFileName) {
        sanitizedFileName = "profile-pic";
      }
      const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
      const filePath = path.join(profilePicturesDir, uniqueFileName);

      // Ensure the filePath is within profilePicturesDir
      const resolvedFilePath = path.resolve(filePath);
      const resolvedProfilePicturesDir = path.resolve(profilePicturesDir);
      if (!resolvedFilePath.startsWith(resolvedProfilePicturesDir + path.sep)) {
        return { success: false, error: "Invalid file path." };
      }

      const fileBuffer = Buffer.from(await newImageFile.arrayBuffer());
      await fs.writeFile(resolvedFilePath, fileBuffer);

      userToUpdate.image = `/uploads/profile_pictures/${uniqueFileName}`;
      changes.push("profile picture");
    }

    // Save the updated users array back to the file
    await fs.writeFile(
      adminUsersFilePath,
      JSON.stringify(users, null, 2),
      "utf-8"
    );

    await addLog({
      user_id: userToUpdate.user_id,
      user_name: userToUpdate.name,
      module: "Settings",
      action: "Updated own profile information.",
      details: {
        updated_fields: changes,
      },
    });

    return { success: true, user: userToUpdate };
  } catch (error) {
    return await handleAndLogApiError(error, `updateUser for ${email}`);
  }
}
