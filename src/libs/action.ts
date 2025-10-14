"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getCurrentUser } from "@/app/lang/[locale]/main/tickets/action";
import { BasicUserData } from "@/context/UserProfileContext";
// src/actions/yeastar.ts
// "use server";

import axios from "axios";
import https from "https";

// Reusable httpsAgent for self-signed Yeastar cert
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// 1. Get access token from Yeastar
export async function getYeastarAccessToken(): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.YEASTAR_CLIENT_ID || "",
      client_secret: process.env.YEASTAR_CLIENT_SECRET || "",
    });

    const response = await axios.post(
      "https://103.89.48.183/openapi/oauth/token", // Yeastar OAuth endpoint
      params,
      { httpsAgent }
    );

    console.log("✅ Yeastar Token Response:", response.data);

    return response.data.access_token;
  } catch (err) {
    console.error("❌ Failed to get Yeastar token:", err);
    return null;
  }
}

// 2. Define Yeastar Extension interface
export interface YeastarExtension {
  id: string;
  extension: string;
  name: string;
  status: string;
  [key: string]: unknown; // keep flexible for unknown fields
}

// 3. Fetch Extensions
export async function fetchYeastarExtensions(): Promise<YeastarExtension[]> {
  const token = await getYeastarAccessToken();
  if (!token) return [];

  try {
    const response = await axios.get(
      "https://103.89.48.183/openapi/v1.0/extensions",
      {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent,
      }
    );

    console.log("✅ Extensions Response:", response.data);

    // Yeastar typically wraps extensions inside `data`
    return response.data.data ?? [];
  } catch (err) {
    console.error("❌ Failed to fetch extensions:", err);
    return [];
  }
}





// Slim version (only basic info)
export async function getBasicUserData(): Promise<BasicUserData> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("No logged-in user found");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, profileUrl: true }
  });

  if (!user) throw new Error("User not found");

  return user;
}



export async function heartbeat() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Find the active session(s) for this user
  const userSessions = await prisma.userSession.findMany({
    where: { userId: session.user.id },
  });

  const now = new Date();
  const extendMs = 1000 * 60 * 5; // 5 minutes

  for (const s of userSessions) {
    // only extend if still using
    const newExpires = new Date(Math.max(s.expiresAt.getTime(), now.getTime() + extendMs));
    await prisma.userSession.update({
      where: { id: s.id },
      data: {
        lastSeen: now,
        expiresAt: newExpires,
      },
    });
  }

  return new Response("OK");
}


export async function deleteUserSession(userId: string) {
  try {
    const deleted = await prisma.userSession.deleteMany({
      where: { userId },
    });

    // Delete previous logout activities
    await prisma.userActivity.deleteMany({
      where: {
        userId,
        action: "LOGOUT",
      },
    });

    // Create new logout activity
    await prisma.userActivity.create({
      data: {
        userId: userId,
        action: "LOGOUT",
      },
    });

    console.log(`Deleted ${deleted.count} session(s) for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete user session:", error);
    return false;
  }
}



// ====================
// User Utilities
// ====================

export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function getUserIdsandEmail(): Promise<{ id: string; email: string; name: string }[]> {
  return prisma.user.findMany({
    where: { isArchived: false },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "desc" }, // sorted by newest first
  });
}

export async function getUserIdsandEmailByDepeartmentId({ id }: { id: string }): Promise<{ id: string; email: string; name: string }[]> {
  return prisma.user.findMany({
    where: { isArchived: false, departmentId: id },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "desc" }, // sorted by newest first
  });
}

// ====================
// Department Utilities
// ====================

export async function getAllDepartmentIdAndName(): Promise<{ id: string; name: string }[]> {
  return prisma.department.findMany({
    where: { isArchived: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" }, // newest first
  });
}

export async function getJobPositionsByDepartment(departmentId: string): Promise<{ id: string; name: string }[]> {
  return prisma.jobPosition.findMany({
    where: { departmentId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" }, // newest first
  });
}

// ====================
// Category Utilities
// ====================
export async function getAllCategoryIdAndName(): Promise<{ id: string; name: string; departmentId: string }[]> {
  return prisma.category.findMany({
    where: { isArchived: false, parentId: null },
    select: {
      id: true,
      name: true,
      departmentId: true,
      // subcategories: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }, // newest first
  });
}


// ====================
// Audit Utilities
// ====================

export interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}




export async function getUnseenTicketCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    // Admins → unseen tickets all
    return prisma.ticket.count({
      where: {
        isArchived: false,
        views: {
          none: {
            userId: user.id, // ဒီ user မကြည့်ရသေးရင်
          },
        },
      },
    });
  }

  if (user.role === "AGENT") {
    // Agents → only assigned tickets unseen
    return prisma.ticket.count({
      where: {
        isArchived: false,
        assignedToId: user.id,
        views: {
          none: {
            userId: user.id,
          },
        },
      },
    });
  }

  if (user.role === "REQUESTER") {
    // Requesters → unseen count မလို
    return 0;
  }

  return 0;
}



export async function createTicketHtml({
  ticketId,
  title,
  description,
  requester,
}: {
  ticketId: string;
  title: string;
  description: string;
  requester: string;
}) {
  return (
    `
<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
  <h2 style="color: #2c7a7b;">🆕 New Ticket Created</h2>
  <p><strong>Ticket ID:</strong> ${ticketId}</p>
  <p><strong>Title:</strong> ${title}</p>
  <p><strong>Description:</strong> ${description}</p>
  <p><strong>Requester:</strong> ${requester}</p>
  <p style="color: #2f855a;">Please check the ticketing system for more details.</p>
  <a href="https://support.eastwindmyanmar.com.mm" style="color: #3182ce;">Go to Ticketing System</a>
</div>
`
  )
}

export async function updateTicketHtml({
  ticketId,
  title,
  description,
  requester,
  updater,
  oldDepartment,
  newDepartment,
  oldAssignee,
  newAssignee,
  updatedFields,
}: {
  ticketId: string;
  title: string;
  description: string;
  requester: string;
  updater: string;
  oldDepartment?: string;
  newDepartment?: string;
  oldAssignee?: string;
  newAssignee?: string;
  updatedFields?: string[];
}) {
  return (`
<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
  <h2 style="color: #2c7a7b;">🔄 Ticket Updated</h2>
  <p><strong>Ticket ID:</strong> ${ticketId}</p>
  <p><strong>Title:</strong> ${title}</p>
  <p><strong>Description:</strong> ${description}</p>
  <p><strong>Requester:</strong> ${requester}</p>
  <p><strong>Updated By:</strong> ${updater}</p>
  ${oldDepartment || newDepartment ? `<p><strong>Department:</strong> ${oldDepartment || "N/A"} ➡️ ${newDepartment || "N/A"}</p>` : ""}
  ${oldAssignee || newAssignee ? `<p><strong>Assignee:</strong> ${oldAssignee || "N/A"} ➡️ ${newAssignee || "N/A"}</p>` : ""}
  ${updatedFields && updatedFields.length ? `<p><strong>Updated Fields:</strong> ${updatedFields.join(", ")}</p>` : ""}
  <p style="color: #2f855a;">Please check the ticketing system for more details.</p>
  <a href="https://support.eastwindmyanmar.com.mm" style="color: #3182ce;">Go to Ticketing System</a>
</div>
`)
}


