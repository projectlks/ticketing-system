import React from "react";
import { getDepartmentNames } from "../../department/action";
import { getCategoriesNames } from "../../category/action";
import { getSingleTicket } from "../action"; // You need this for edit
import TicketcreateForm from "./TicketcreateForm";
import { getUserToAssign } from "../../user/action";




type PageProps = {
  se?: Promise<{
    searchParams: {
      mode?: string;
      id?: string;
    };
  }>;
};

export default async function Page({ se }: PageProps) {
  // Await the Promise
  const params = se ? await se : { searchParams: {} };
  const searchParams = params.searchParams;

  const mode: "create" | "edit" =
    searchParams?.mode === "edit" && typeof searchParams?.id === "string"
      ? "edit"
      : "create";

  const ticketId = searchParams?.id;

  const departments = await getDepartmentNames();
  const categories = await getCategoriesNames();
  const users = await getUserToAssign()

  // Load ticket only for edit mode
  const ticket = mode === "edit" && ticketId
    ? await getSingleTicket(ticketId)
    : null;




  return (
    <TicketcreateForm
      mode={mode}
      cats={categories}
      depts={departments}
      ticket={ticket}
      users={users}
    />
  );
}
