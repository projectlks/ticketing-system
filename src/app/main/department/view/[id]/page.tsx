





import DepartmentView from './DepartmentView';
import { getDepartment, getDepartmentAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';



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
      <header className="mb-8 md:mb-10 flex items-center ">


        <BackBtn />

        <div>

          <h1 className="text-2xl font-semibold tracking-tight">Department</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details and recent changes.</p>
        </div>
      </header>


      <DepartmentView department={department} auditLog={audit} />

    </div>
  );
}
