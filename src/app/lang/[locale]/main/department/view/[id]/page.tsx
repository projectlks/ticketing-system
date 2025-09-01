





import DepartmentView from './DepartmentView';
import { getDepartment, getDepartmentAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';
import ViewHeader from '@/components/ViewHeader';



export default async function DepartmentPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  // Await params so it works whether Next's generated type provides a Promise or a plain object
  const routeParams = await params;
  const id = routeParams?.id;
  if (!id) return null;

  const audit = await getDepartmentAuditLogs(id);

  const department = await getDepartment(id);

  if (!department) {
    return <p className="p-6 text-center text-red-500">Department not found.</p>;
  }


  return (
    <div className="w-full min-h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      <ViewHeader name="departments" />


      <DepartmentView department={department} auditLog={audit} />

    </div>
  );
}
