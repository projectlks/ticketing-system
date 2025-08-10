
// "use client";

import DepartmentView from './DepartmentView';
import { getDepartment, getDepartmentAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';


interface PageProps {
  params: { id: string };
}

export default async function DepartmentPage({ params }: PageProps) {
  // Fetch data server-side


  const audit = await getDepartmentAuditLogs(params.id);

  const department = await getDepartment(params.id);

if (!params.id) return null;
  if (!department) {
    return <p className="p-6 text-center text-red-500">Department not found.</p>;
  }


  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
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
