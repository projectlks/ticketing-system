import React from "react";
import { getDepartmentNames } from "../../department/action";
import { getCategoriesNames } from "../../category/action";
import { getSingleTicket, getTicketAuditLogs } from "../action"; // You need this for edit
import { getUserToAssign } from "../../user/action";
import { CommentWithRelations } from "@/components/CommentSection";
import { getCommentWithTicketId } from "@/libs/action";
import TicketForm from "../TicketForm";

export default async function Page({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  const routeParams = await params;
  const id = routeParams?.id;
  if (!id) return null;

  const departments = await getDepartmentNames();
  const categories = await getCategoriesNames();
  const users = await getUserToAssign();

  // Load ticket only for edit mode
  const ticket = await getSingleTicket(id);
  const auditlog = await getTicketAuditLogs(id);
  const commets: CommentWithRelations[] = await getCommentWithTicketId(id);

  return (
    <TicketForm
      mode={"edit"}
      cats={categories}
      depts={departments}
      ticket={ticket}
      auditLog={auditlog}
      users={users}
      comment={commets}
    />
  );
}
