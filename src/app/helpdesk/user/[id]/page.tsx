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
  const [departments, userResult] = await Promise.all([
    getDepartmentNames(),
    getUserById(id),
  ]);

  if (userResult.error || !userResult.data) {
    if (userResult.error === "User not found") {
      notFound();
    }

    return (
      <div className="p-6 text-sm text-red-600">
        {userResult.error ?? "Failed to load user."}
      </div>
    );
  }

  return <EditUserForm user={userResult.data} departments={departments} />;
}
