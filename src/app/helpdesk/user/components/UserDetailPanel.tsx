import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import Avatar from "@/components/Avatar";

import { STATUS_COLUMNS, type TicketStats, type UserTicketStatus } from "../types";

type UserDetailPanelProps = {
  user: TicketStats | null;
  onOpenProfile: (id: string) => void;
};

const sumStatus = (value: UserTicketStatus) =>
  value.new + value.open + value.inprogress + value.closed;

function StatusBreakdown({
  title,
  value,
  maxSectionLoad,
}: {
  title: string;
  value: UserTicketStatus;
  maxSectionLoad: number;
}) {
  const sectionTotal = sumStatus(value);
  const barPercent =
    maxSectionLoad > 0 ? Math.round((sectionTotal / maxSectionLoad) * 100) : 0;

  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-800">{title}</h3>
        <span className="text-sm font-semibold text-zinc-900">{sectionTotal}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        <span
          style={{ width: `${Math.max(5, barPercent)}%` }}
          className="block h-full rounded-full bg-zinc-800"
        />
      </div>

      {/* Status grid ကို compact card အဖြစ်တင်ထားလို့ total + distribution နှစ်ခုလုံးကို
          detail panel တစ်ခုတည်းမှာ scan လုပ်နိုင်ပြီး context switch မလိုတော့ပါ။ */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_COLUMNS.map((status) => (
          <div key={`${title}-${status.key}`} className="rounded-md bg-white px-2 py-2 text-center">
            <p className="text-base font-semibold text-zinc-900">{value[status.key]}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
              {status.label}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function UserDetailPanel({
  user,
  onOpenProfile,
}: UserDetailPanelProps) {
  if (!user) {
    return (
      <article className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-500">Select a user from the list to view details.</p>
      </article>
    );
  }

  const assignedTotal = sumStatus(user.assigned);
  const openedTotal = sumStatus(user.created);
  const maxSectionLoad = Math.max(assignedTotal, openedTotal, 1);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              {user.name}
            </h2>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenProfile(user.id)}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          Open Profile
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <StatusBreakdown
          title="Assigned To This User"
          value={user.assigned}
          maxSectionLoad={maxSectionLoad}
        />
        <StatusBreakdown
          title="Opened By This User"
          value={user.created}
          maxSectionLoad={maxSectionLoad}
        />
      </div>
    </article>
  );
}
