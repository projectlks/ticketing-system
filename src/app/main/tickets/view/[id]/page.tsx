





import TicketView from './TicketView';
import { getTicketDetail, getTicketAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';


interface PageProps {
  params: { id: string };
}

export default async function DepartmentPage({ params }: PageProps) {
  // Fetch data server-side

  if (!params.id) return null;

  const audit = await getTicketAuditLogs(params.id);

  const ticket = await getTicketDetail(params.id);

  if (!ticket) {
    return <p className="p-6 text-center text-red-500">Department not found.</p>;
  }


  return (
    <div className="w-full min-h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      <header className="mb-8 md:mb-10 flex items-center ">


        <BackBtn />

        <div>

          <h1 className="text-2xl font-semibold tracking-tight">Ticket</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details and recent changes.</p>
        </div>
      </header>


      <TicketView ticket={ticket} auditLog={audit} />

    </div>
  );
}
