// ...existing code...
import { getAccount, getAccountAuditLogs } from '../../action';
import AccountView from './AccountView';
import ViewHeader from '@/components/ViewHeader';

// remove the custom Props type and annotate params inline as optional Promise
export default async function DepartmentPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  // Await params so it works whether Next's generated type provides a Promise or a plain object
  const routeParams = await params;
  const id = routeParams?.id;
  if (!id) return null;

  const audit = await getAccountAuditLogs(id);
  const account = await getAccount(id);





  if (!account) {
    return <p className="p-6 text-center text-red-500">Account not found.</p>;
  }

  return (
    <div className="w-full min-h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      <ViewHeader name="users" />

      <AccountView account={account} auditLog={audit} />
    </div>
  );
}
// ...existing code...