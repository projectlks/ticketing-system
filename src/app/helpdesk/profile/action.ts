"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/client";
import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { HELPDESK_CACHE_PREFIXES } from "../cache/redis-keys";

const UPLOAD_API_PREFIX = "/api/uploads/";

type ProfileActionResult<T> = {
  data?: T;
  error?: string;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};

const UpdateMyProfileSchema = z.object({
  name: z.string().trim().min(5, "Name must be at least 5 characters").max(100),
  profileUrl: z
    .string()
    .trim()
    .max(1000, "Profile URL is too long")
    .refine((value) => !value || value.startsWith(UPLOAD_API_PREFIX) || /^https?:\/\//i.test(value), {
      message: "Invalid profile image URL",
    }),
});

const UpdateMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type MyAccountProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileUrl: string | null;
  departmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function requireCurrentUserId(): Promise<ProfileActionResult<string>> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: "Unauthorized" };
  return { data: currentUserId };
}

function resolveUploadRelativePathFromUrl(url: string): string | null {
  if (!url.startsWith(UPLOAD_API_PREFIX)) return null;
  const rawPath = url.slice(UPLOAD_API_PREFIX.length).trim();
  if (!rawPath) return null;

  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length || segments.length > 2) return null;

  if (segments.length === 2) {
    const [folder, fileName] = segments;
    const safeFileName = path.basename(fileName);
    if (safeFileName !== fileName || safeFileName === "." || safeFileName === "..") {
      return null;
    }
    if (folder !== "images" && folder !== "files") return null;
    return `${folder}/${safeFileName}`;
  }

  const [fileName] = segments;
  const safeFileName = path.basename(fileName);
  if (safeFileName !== fileName || safeFileName === "." || safeFileName === "..") {
    return null;
  }

  if (safeFileName.startsWith("img-")) return `images/${safeFileName}`;
  if (safeFileName.startsWith("file-")) return `files/${safeFileName}`;

  // Backward compatibility for old uploads kept directly in uploads/
  return safeFileName;
}

async function deleteLocalUploadFileIfExists(
  url: string | null,
): Promise<string | null> {
  if (!url) return null;

  const relativePath = resolveUploadRelativePathFromUrl(url);
  if (!relativePath) return null;

  const absolutePath = path.join(
    process.cwd(),
    "uploads",
    ...relativePath.split("/"),
  );

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return toErrorMessage(error, "Failed to delete old upload.");
    }
  }

  return null;
}

export async function getMyAccountProfile(): Promise<
  ProfileActionResult<MyAccountProfile>
> {
  const currentUserResult = await requireCurrentUserId();
  if (currentUserResult.error || !currentUserResult.data) {
    return { error: currentUserResult.error ?? "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUserResult.data },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profileUrl: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) return { error: "User not found" };

  return {
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileUrl: user.profileUrl,
      departmentName: user.department?.name ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

export async function updateMyAccountProfile(
  formData: FormData,
): Promise<
  ProfileActionResult<{
    id: string;
    name: string;
    email: string;
    profileUrl: string | null;
    updatedAt: Date;
  }>
> {
  const currentUserResult = await requireCurrentUserId();
  if (currentUserResult.error || !currentUserResult.data) {
    return { error: currentUserResult.error ?? "Unauthorized" };
  }
  const currentUserId = currentUserResult.data;

  const existingUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { profileUrl: true },
  });
  if (!existingUser) return { error: "User not found" };

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    profileUrl: formData.get("profileUrl")?.toString() ?? "",
  };
  const parsed = UpdateMyProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid profile data.",
    };
  }
  const nextProfileUrl = parsed.data.profileUrl || null;

  // Security: email/role fields are locked in profile update
  let updatedUser: {
    id: string;
    name: string;
    email: string;
    profileUrl: string | null;
    updatedAt: Date;
  };

  try {
    updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        name: parsed.data.name,
        profileUrl: nextProfileUrl,
        updaterId: currentUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileUrl: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to update profile.") };
  }

  if (existingUser.profileUrl !== nextProfileUrl) {
    const deleteError = await deleteLocalUploadFileIfExists(existingUser.profileUrl);
    if (deleteError) {
      console.log("[profile] failed to delete old upload file", {
        profileUrl: existingUser.profileUrl,
        message: deleteError,
      });
    }
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.overview,
    HELPDESK_CACHE_PREFIXES.tickets,
  ]);

  revalidatePath("/helpdesk/profile");
  revalidatePath("/helpdesk");

  return { data: updatedUser };
}

export async function updateMyAccountPassword(
  formData: FormData,
): Promise<ProfileActionResult<null>> {
  const currentUserResult = await requireCurrentUserId();
  if (currentUserResult.error || !currentUserResult.data) {
    return { error: currentUserResult.error ?? "Unauthorized" };
  }
  const currentUserId = currentUserResult.data;

  const raw = {
    currentPassword: formData.get("currentPassword")?.toString() ?? "",
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  };
  const parsed = UpdateMyPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid password data.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { password: true },
  });
  if (!user || !user.password) {
    return { error: "Password is not set for this account." };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!isValid) {
    return { error: "Current password is incorrect." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

  try {
    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        password: hashedPassword,
        updaterId: currentUserId,
      },
      select: { id: true },
    });
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to update password.") };
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.overview,
  ]);

  revalidatePath("/helpdesk/profile");

  return { data: null };
}
