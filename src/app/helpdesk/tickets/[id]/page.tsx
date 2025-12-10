import React from "react";
import { getDepartmentNames } from "../../department/action";
import { getCategoriesNames } from "../../category/action";
import { getSingleTicket, getTicketAuditLogs } from "../action"; // You need this for edit
import TicketcreateForm from "../new/TicketcreateForm";
import { getUserToAssign } from "../../user/action";






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
    const users =  await getUserToAssign()


    // Load ticket only for edit mode
    const ticket = await getSingleTicket(id)
    const auditlog = await getTicketAuditLogs(id)




    return (
        <TicketcreateForm
            mode={"edit"}
            cats={categories}
            depts={departments}
            ticket={ticket}
            auditLog={auditlog}
            users = {users}
        />
    );
}
