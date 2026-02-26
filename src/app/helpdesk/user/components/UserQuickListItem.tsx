import Avatar from "@/components/Avatar";

import type { TicketStats, UserTicketStatus } from "../types";

type UserQuickListItemProps = {
  user: TicketStats;
  isActive: boolean;
  onSelect: () => void;
};

const sumStatus = (value: UserTicketStatus) =>
  value.new + value.open + value.inprogress + value.closed;

export default function UserQuickListItem({
  user,
  isActive,
  onSelect,
}: UserQuickListItemProps) {
  const assignedTotal = sumStatus(user.assigned);
  const openedTotal = sumStatus(user.created);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-3 py-3 text-left transition-colors ${
        isActive ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
        </div>
      </div>

      {/* Quick chip နှစ်ခုနဲ့ workload orientation ကို list panel ကနေတန်းမြင်နိုင်အောင်ထားပါတယ်။ */}
      <div className="mt-2 flex items-center gap-1.5 text-[11px] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
        <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700">
          A {assignedTotal}
        </span>
        <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700">
          O {openedTotal}
        </span>
      </div>
    </button>
  );
}
