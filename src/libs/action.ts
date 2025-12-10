"use server"

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { BasicUserData } from "@/context/UserProfileContext";
import { ZabbixProblem } from "@/types/zabbix";


export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
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


export async function getCurrentUserData() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("No logged-in user found");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creator: true,
      updater: true,

      // Departments
      createdDepartments: true,
      // managedDepartments: true,
      updatedDepartments: true,

      // Job positions

      // Categories

      // Tickets
      requestTickets: {
        include: {
          category: true,
          // subcategory: true,
          department: true,
          assignedTo: true,
        },
      },
      assignedTickets: {
        include: {
          category: true,
          // subcategory: true,
          department: true,
          requester: true,
        },
      },

      // Comments & likes
      comments: { include: { ticket: true } },
      likes: { include: { comment: { include: { ticket: true } } } },

      // Audits
      audits: { include: { user: true } },
    },
  });

  if (!user) throw new Error("User not found");

  return user;
}



// ======================
// Zabbix JSON-RPC helper
// ======================
async function zabbixRequest<T>(
  method: string,
  params: Record<string, unknown>,
  token: string,
  url: string
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      auth: token,
      id: 1,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`${data.error.message}: ${data.error.data}`);
  return data.result;
}

// ======================
// Check event status in Zabbix
// ======================
export async function checkEventStatus(eventId: string): Promise<{ exists: boolean; status?: string }> {
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;

  // Fetch active problems only
  const problems = await zabbixRequest<ZabbixProblem[]>(
    "problem.get",
    {
      output: ["eventid", "r_eventid"],
      eventids: [eventId],
    },
    token,
    url
  );

  if (!problems || problems.length === 0) {
    return { exists: false, status: "Resolved / Not active" };
  }

  return { exists: true, status: problems[0].r_eventid }; 
}
