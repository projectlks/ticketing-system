"use client";

import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";

type UserToolbarProps = {
  searchQuery: string;
  shownCount: number;
  totalAssigned: number;
  totalOpened: number;
  totalLoad: number;
  isLoading: boolean;
  lastUpdatedAt: string;
  activeUserName: string | null;
  onSearchChange: (value: string) => void;
  onCreateUser: () => void;
};

export default function UserToolbar({
  searchQuery,
  shownCount,
  totalAssigned,
  totalOpened,
  totalLoad,
  isLoading,
  lastUpdatedAt,
  activeUserName,
  onSearchChange,
  onCreateUser,
}: UserToolbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-[radial-gradient(circle_at_12%_8%,#f5f5f5_0%,#ffffff_52%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Workspace
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-900">
              User Workbench
            </h1>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {activeUserName ? `Focused: ${activeUserName}` : "Select a user to inspect load"}
            </p>
          </div>

          {/* Search နဲ့ action ကို fixed-height control row အဖြစ်ထားလို့
              header block က viewport ဘယ်လောက်သေးသေး အမြင့်မကြီးဘဲတိတိကျကျနေပါမယ်။ */}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <label className="relative block w-full sm:min-w-[280px]">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Search name or email"
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white/90 pl-8 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </label>

            <button
              type="button"
              onClick={onCreateUser}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              New User
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
            visible {shownCount}
          </span>
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
            assigned {totalAssigned}
          </span>
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
            opened {totalOpened}
          </span>
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
            load {totalLoad}
          </span>
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-500">
            {isLoading
              ? "syncing..."
              : lastUpdatedAt
                ? `updated ${lastUpdatedAt}`
                : "live"}
          </span>
        </div>
      </div>
    </header>
  );
}
