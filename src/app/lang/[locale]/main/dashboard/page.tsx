// app/main/dashboard/page.tsx
"use server";

import React from "react";
import DashboardCards from "./DashboardCards";
import RecentTicketsAndActivity from "./RecentTicketsAndActivity";
import TicketTrendsChart from "./TicketTrendsChart";
import PriorityChart from "./PriorityChart";
import {
  getLast5Audit,
  getLast5Tickets,
  getMonthlyTicketStatsByStatus,
} from "./action";
import { Audit, Ticket, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export type TicketWithRelations = Ticket & {
  category: { id: string; name: string } | null;
  requester: { id: string; name: string; email: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
};

export type AuditWithRelations = Audit & {
  user: { id: string; name: string };
};

export default async function Page() {
  // Get current session
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Not authenticated");

  const userId = session.user.id;

  // Convert string to Role safely
  const validRoles: Role[] = ["SUPER_ADMIN", "ADMIN", "REQUESTER", "AGENT"];
  if (!validRoles.includes(session.user.role as Role)) {
    throw new Error("Invalid role");
  }
  const role: Role = session.user.role as Role;

  // Fetch all dashboard data
  const stats = await getMonthlyTicketStatsByStatus(role, userId);
  const tickets: TicketWithRelations[] = await getLast5Tickets(role, userId);
  const audit: AuditWithRelations[] = await getLast5Audit();

  return (
    <>
      <DashboardCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TicketTrendsChart role={role} userId={userId} />
        <PriorityChart role={role} userId={userId} />
      </div>

      <RecentTicketsAndActivity tickets={tickets} audit={audit} />
    </>
  );
}
