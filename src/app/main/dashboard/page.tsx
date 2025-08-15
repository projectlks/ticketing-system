import React from 'react'
import DashboardCards from './DashboardCards'
import RecentTicketsAndActivity from './RecentTicketsAndActivity'
import { getLast5Audit, getLast5Tickets, getMonthlyTicketStatsByStatus } from './action';
import TicketTrendsChart from './TicketTrendsChart';
import PriorityChart from './PriorityChart';
import { Audit, Ticket } from '@prisma/client';


export type TicketWithRelations = Ticket & {
  category: {
    id: string;
    name: string;
  };
};


export type AuditWithRelations = Audit & {
  user: {
    id: string;
    name: string
  }
}

export default async function page() {
  const stats = await getMonthlyTicketStatsByStatus();
  const tickets: TicketWithRelations[] = await getLast5Tickets();
  const audit : AuditWithRelations[] = await getLast5Audit();


  return (
    <>
      <DashboardCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TicketTrendsChart />
        <PriorityChart />
      </div>
      <RecentTicketsAndActivity tickets={tickets} audit={audit} />
    </>
  )
}
