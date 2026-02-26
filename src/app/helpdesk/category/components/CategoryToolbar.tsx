"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type CategoryToolbarProps = {
  searchQuery: string;
  totalCount: number;
  visibleCount: number;
  activeCategoryName: string | null;
  isLoading: boolean;
  lastUpdatedAt: string;
  onSearchChange: (value: string) => void;
  onStartCreate: () => void;
};

export default function CategoryToolbar({
  searchQuery,
  totalCount,
  visibleCount,
  activeCategoryName,
  isLoading,
  lastUpdatedAt,
  onSearchChange,
  
}: CategoryToolbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-[radial-gradient(circle_at_12%_8%,#f5f5f5_0%,#ffffff_54%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Configuration
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
              Category Workbench
            </h1>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {activeCategoryName
                ? `Editing: ${activeCategoryName}`
                : "Create or edit categories with department mapping"}
            </p>
          </div>

          {/* Search + create action ကို single rhythm နဲ့ထားလို့
              desktop/mobile နှစ်ဖက်လုံးမှာ compact control layout ရနေပါမယ်။ */}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <label className="relative block w-full sm:min-w-[280px]">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Search category or department"
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </label>

      
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-[ui-monospace,SFMono-Regular,Menlo,monospace]">
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
            total {totalCount}
          </span>
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
            visible {visibleCount}
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
