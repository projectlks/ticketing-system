import { notFound } from "next/navigation";

import { getDepartmentNames } from "../../department/action";
import { getUserById } from "../action";
import EditUserForm from "./EditUserForm";

type EditUserPageProps = {
  params?: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: EditUserPageProps) {
  const routeParams = await params;
  const id = routeParams?.id;

  if (!id) {
    notFound();
  }

  // Edit form render မတိုင်ခင် departments + user detail ကို parallel fetch ထားလို့
  // route enter time ကိုလျော့ပြီး form initial data ပြည့်ပြည့်စုံစုံပြန်ရနိုင်ပါတယ်။
  const [departments, user] = await Promise.all([
    getDepartmentNames(),
    getUserById(id),
  ]);

  return <EditUserForm user={user} departments={departments} />;
}
