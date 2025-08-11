





import { getCategory, getCategoryAuditLogs } from '../../action';
import BackBtn from '@/components/BackBtn';
import CategoryView from './CategoryView';


interface PageProps {
  params: { id: string };
}

export default async function DepartmentPage({ params }: PageProps) {
  // Fetch data server-side

  if (!params.id) return null;

  const audit = await getCategoryAuditLogs(params.id);

  const category = await getCategory(params.id);

  if (!category) {
    return <p className="p-6 text-center text-red-500">Category not found.</p>;
  }


  return (
    <div className="w-full min-h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      <header className="mb-8 md:mb-10 flex items-center ">


        <BackBtn />

        <div>

          <h1 className="text-2xl font-semibold tracking-tight">Category</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details and recent changes.</p>
        </div>
      </header>


      <CategoryView category={category} auditLog={audit} />

    </div>
  );
}
