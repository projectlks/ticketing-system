"use client";

import Countdown from "@/components/Countdown";
import { Status } from "@/generated/prisma/client";

type Props = {
  ticketId: string;
  mode: "create" | "edit";
  resolutionDue?: Date | string | null;
  status: Status;
  onStatusChange: (s: Status) => void;
};

const statuses: Status[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELED",
];

export default function Header({
  ticketId,
  mode,
  resolutionDue,
  status,
  onStatusChange,
}: Props) {
  const resolutionDueDate = resolutionDue ? new Date(resolutionDue) : undefined;
  const resolutionDueIso =
    resolutionDueDate && !Number.isNaN(resolutionDueDate.getTime())
      ? resolutionDueDate.toISOString()
      : null;

  return (
    <header className="space-y-5 border-b border-zinc-200 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            {mode === "create" ? "Create Ticket" : "Update Ticket"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {ticketId}
          </h1>
        </div>

        {mode === "edit" && resolutionDueIso && (
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600">
            {/* Edit mode မှာ SLA ကျန်ချိန်ကို အမြင်လွယ်အောင် header ထဲကနေပြထားပါတယ်။ */}
            <span className="mr-2 font-medium">Time left</span>
            <Countdown targetTime={resolutionDueIso} />
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
          Status
        </p>
        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => {
            const isActive = item === status;
            return (
              <button
                key={item}
                type="button"
                disabled={mode !== "edit"}
                onClick={() => onStatusChange(item)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                } ${mode !== "edit" ? "cursor-not-allowed opacity-60" : ""}`}>
                {item.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
