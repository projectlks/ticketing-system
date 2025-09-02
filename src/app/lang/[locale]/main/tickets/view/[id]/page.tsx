





import TicketView from './TicketView';
import { getTicketDetail, getTicketAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';
import { getUserIdsandEmailByDepeartmentId } from '@/libs/action';
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



  const audit = await getTicketAuditLogs(id);

  const ticket = await getTicketDetail(id);

  const user = await getUserIdsandEmailByDepeartmentId({ id: ticket?.department.id || '' })

  if (!ticket) {
    return <p className="p-6 text-center text-red-500">Department not found.</p>;
  }


  return (
    <div className="w-full min-h-full bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 space-y-8 text-gray-900 dark:text-gray-100">      <ViewHeader name="tickets" />


      <TicketView ticket={ticket} auditLog={audit} users={user} />

    </div>
  );
}
