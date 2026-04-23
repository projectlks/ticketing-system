"use server";

import {
  createTicket as createTicketAction,
  deleteTickets as deleteTicketsAction,
  generateTicketId as generateTicketIdAction,
  updateTicket as updateTicketAction,
  updateTicketStatus as updateTicketStatusAction,
} from "./_lib/mutations";
import {
  getAllTickets as getAllTicketsQuery,
  getMyTickets as getMyTicketsQuery,
  getSingleTicket as getSingleTicketQuery,
  getSlaViolationCount as getSlaViolationCountQuery,
  getTicketAuditLogs as getTicketAuditLogsQuery,
} from "./_lib/queries";

export type {
  GetTicketsOptions,
  SingleTicket,
  TicketWithRelations,
} from "./_lib/shared";

export async function generateTicketId(
  ...args: Parameters<typeof generateTicketIdAction>
) {
  return generateTicketIdAction(...args);
}

export async function createTicket(
  ...args: Parameters<typeof createTicketAction>
) {
  return createTicketAction(...args);
}

export async function updateTicket(
  ...args: Parameters<typeof updateTicketAction>
) {
  return updateTicketAction(...args);
}

export async function updateTicketStatus(
  ...args: Parameters<typeof updateTicketStatusAction>
) {
  return updateTicketStatusAction(...args);
}

export async function getSingleTicket(
  ...args: Parameters<typeof getSingleTicketQuery>
) {
  return getSingleTicketQuery(...args);
}

export async function getAllTickets(
  ...args: Parameters<typeof getAllTicketsQuery>
) {
  return getAllTicketsQuery(...args);
}

export async function getMyTickets(
  ...args: Parameters<typeof getMyTicketsQuery>
) {
  return getMyTicketsQuery(...args);
}

export async function getTicketAuditLogs(
  ...args: Parameters<typeof getTicketAuditLogsQuery>
) {
  return getTicketAuditLogsQuery(...args);
}

export async function getSlaViolationCount(
  ...args: Parameters<typeof getSlaViolationCountQuery>
) {
  return getSlaViolationCountQuery(...args);
}

export async function deleteTickets(
  ...args: Parameters<typeof deleteTicketsAction>
) {
  return deleteTicketsAction(...args);
}
