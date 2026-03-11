import { Role } from "@/generated/prisma/client";
import { prisma } from "@/libs/prisma";
import { getCurrentUserId } from "@/libs/action";

type AdminGuardResult =
  | { data: { id: string; email: string; role: Role } }
  | { error: string };

const SUPER_ADMIN_ROLE: Role = "SUPER_ADMIN";

const parseAllowedEmails = () => {
  const raw = process.env.SUPER_ADMIN_ALLOWED_EMAILS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

export async function requireSuperAdminAndEmail(): Promise<AdminGuardResult> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { error: "Unauthorized" };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, email: true, role: true, isArchived: true },
  });

  if (!currentUser || currentUser.isArchived) {
    return { error: "Unauthorized" };
  }

  if (currentUser.role !== SUPER_ADMIN_ROLE) {
    return { error: "Only SUPER_ADMIN can perform this action." };
  }

  const allowedEmails = parseAllowedEmails();
  if (!allowedEmails.length) {
    return { error: "SUPER_ADMIN_ALLOWED_EMAILS is not configured." };
  }

  if (!allowedEmails.includes(currentUser.email.toLowerCase())) {
    return { error: "Your account is not allowed to perform this action." };
  }

  return { data: { id: currentUser.id, email: currentUser.email, role: currentUser.role } };
}
