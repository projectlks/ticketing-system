"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getCurrentUser } from "@/app/main/tickets/action";
import { NextResponse } from "next/server";

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
export async function getAllCategoryIdAndName(): Promise<{ id: string; name: string; subcategories: { id: string; name: string }[] }[]> {
  return prisma.category.findMany({
    where: { isArchived: false, parentId: null },
    select: {
      id: true,
      name: true,
      subcategories: { select: { id: true, name: true } }
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



// app/api/tickets/count/route.ts


// export async function getTicketCount() {
//   const user = await getCurrentUser();
//   if (!user) throw new Error("Unauthorized");

//   let where = {};

//   if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
//     // အကုန်ပြမယ်
//     where = {};
//   } else if (user.role === "AGENT") {
//     // Agent assigned tickets only
//     where = { assignedToId: user.id };
//   } else if (user.role === "REQUESTER") {
//     // Requester tickets only
//     where = { requesterId: user.id }; // categoryId -> requesterId
//   }

//   // Only count non-archived tickets
//   const count = await prisma.ticket.count({
//     where: {
//       ...where,
//       isArchived: false,

//       // priority: "HIGH", // "အရေးအတွက်" tickets ကို HIGh priority ဆို assume
//     },
//   });

//   return count;
// }


// export async function getUnseenTicketCount() {
//   const user = await getCurrentUser();
//   if (!user) throw new Error("Unauthorized");

//   let where: any = { isArchived: false };

//   if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
//     // Admin / SuperAdmin → အကုန်မြင်နိုင်
//     where = {
//       ...where,
//       views: {
//         none: { userId: user.id }, // မကြည့်ရသေးတာများ
//       },
//     };
//   } else if (user.role === "AGENT") {
//     // Agent → သူ့ကို assign လုပ်ထားတဲ့ ticket တွေထဲက မကြည့်ရသေးတာများ
//     where = {
//       ...where,
//       assignedToId: user.id,
//       views: {
//         none: { userId: user.id },
//       },
//     };
//   } else if (user.role === "REQUESTER") {
//     // Requester → သူဖွင့်ထားတဲ့ ticket တွေကိုသာ ပြ
//     // count မလိုရင် ဒီထဲမှာမထည့်ဘဲ return 0 လည်း လုပ်နိုင်
//     where = {
//       ...where,
//       requesterId: user.id,
//     };
//   }

//   const count = await prisma.ticket.count({
//     where,
//   });

//   return count;
// }


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
