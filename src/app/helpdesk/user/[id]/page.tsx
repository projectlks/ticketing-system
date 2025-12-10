// src/app/helpdesk/user/[id]/page.tsx
import { getDepartmentNames } from "../../department/action";
import { getUserById } from "../action";
import EditUserForm from "./EditUserForm";

export default async function EditUserPage({
    params,
}: {
    params?: Promise<{ id: string }>;
}) {


    const routeParams = await params;
    const id = routeParams?.id;
    if (!id) return null;




    const [departments, user] = await Promise.all([
        getDepartmentNames(),
        getUserById(id),
        
    ]);

    return <EditUserForm user={user} departments={departments} />;
}
