





// import DepartmentView from './AccountView';
import { getAccount, getAccountAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';
import AccountView from './AccountView';


interface PageProps {
  params: { id: string };
}

export default async function DepartmentPage({ params }: PageProps) {
  // Fetch data server-side

  if (!params.id) return null;

  const audit = await getAccountAuditLogs(params.id);

  const account = await getAccount(params.id);

  if (!account) {
    return <p className="p-6 text-center text-red-500">Account not found.</p>;
  }


  return (
    <div className="w-full min-h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      <header className="mb-8 md:mb-10 flex items-center ">


        <BackBtn />

        <div>

          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details and recent changes.</p>
        </div>
      </header>


      <AccountView account={account} auditLog={audit} />

    </div>
  );
}
