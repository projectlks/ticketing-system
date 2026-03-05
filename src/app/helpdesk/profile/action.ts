"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/client";
import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { z } from "zod";

import { HELPDESK_CACHE_PREFIXES } from "../cache/redis-keys";

const UPLOAD_API_PREFIX = "/api/uploads/";

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

async function requireCurrentUserId(): Promise<string> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("Unauthorized");
  return currentUserId;
}

function extractUploadFileNameFromUrl(url: string): string | null {
  if (!url.startsWith(UPLOAD_API_PREFIX)) return null;
  const rawFileName = url.slice(UPLOAD_API_PREFIX.length).trim();
  if (!rawFileName) return null;

  const safeFileName = path.basename(rawFileName);
  if (!safeFileName || safeFileName === "." || safeFileName === "..") return null;

  return safeFileName;
}

async function deleteLocalUploadFileIfExists(url: string | null): Promise<void> {
  if (!url) return;

  const safeFileName = extractUploadFileNameFromUrl(url);
  if (!safeFileName) return;

  const absolutePath = path.join(process.cwd(), "uploads", safeFileName);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    // File already deleted ဖြစ်နိုင်လို့ ENOENT ကို ignore လုပ်ပြီး process မပျက်စေပါ။
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function getMyAccountProfile(): Promise<MyAccountProfile> {
  const currentUserId = await requireCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
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

  if (!user) throw new Error("User not found");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileUrl: user.profileUrl,
    departmentName: user.department?.name ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateMyAccountProfile(formData: FormData): Promise<{
  id: string;
  name: string;
  email: string;
  profileUrl: string | null;
  updatedAt: Date;
}> {
  const currentUserId = await requireCurrentUserId();
  const existingUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { profileUrl: true },
  });
  if (!existingUser) throw new Error("User not found");

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    profileUrl: formData.get("profileUrl")?.toString() ?? "",
  };
  const parsed = UpdateMyProfileSchema.parse(raw);
  const nextProfileUrl = parsed.profileUrl || null;

  // Security: email/role fields များကို profile update payload ထဲမထည့်ထားသဖြင့်
  // self-profile page က account identity/permission ကိုမပြောင်းနိုင်ပါ။
  const updatedUser = await prisma.user.update({
    where: { id: currentUserId },
    data: {
      name: parsed.name,
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

  // Profile image ပြောင်းသွားပြီဆိုရင် old uploaded file ကို filesystem မှာတကယ်ဖျက်ပေးသည်။
  if (existingUser.profileUrl !== nextProfileUrl) {
    await deleteLocalUploadFileIfExists(existingUser.profileUrl).catch((error) => {
      console.error("[profile] failed to delete old upload file", {
        profileUrl: existingUser.profileUrl,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.overview,
    HELPDESK_CACHE_PREFIXES.tickets,
  ]);

  revalidatePath("/helpdesk/profile");
  revalidatePath("/helpdesk");

  return updatedUser;
}
