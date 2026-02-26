"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Searchbox from "@/components/SearchBox/SearchBox";

interface FilterGroup {
  title: string;
  options: string[];
}

interface Column {
  key: string;
  label: string;
}

interface TableTopBarProps {
  title: string;
  onNew: () => void;

  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;

  filterGroups: FilterGroup[];
  selectedFilters: Record<string, string[]>;
  setSelectedFilters: Dispatch<SetStateAction<Record<string, string[]>>>;

  columns: Column[];

  selectedSearchQueryFilters: Record<string, string[]>;
  setSelectedSearchQueryFilters: Dispatch<
    SetStateAction<Record<string, string[]>>
  >;

  visibleColumns: Record<string, boolean>;
  toggleColumn: (key: string) => void;

  onDownload: () => void;
  downloadDisabled: boolean;
}

export default function TableTopBar({
  title,
  onNew,
  searchQuery,
  setSearchQuery,
  filterGroups,
  selectedFilters,
  setSelectedFilters,
  columns,
  selectedSearchQueryFilters,
  setSelectedSearchQueryFilters,
  visibleColumns,
  toggleColumn,
  onDownload,
  downloadDisabled,
}: TableTopBarProps) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showColumnMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!columnMenuRef.current) return;
      if (!columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowColumnMenu(false);
      }
    };

    // Column menu ဖွင့်နေချိန်မှာ outside click / ESC နှိပ်ရင်ပိတ်ပေးထားလို့
    // table workspace ကိုဆက်သုံးတဲ့ UX က modal-like stuck မဖြစ်ဘဲ ပိုမြန်ပါတယ်။
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showColumnMenu]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <PlusIcon className="h-4 w-4" />
            New Ticket
          </button>

          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-900">
              {title}
            </h1>
            <p className="text-xs text-zinc-500">
              Search, filter and manage your queue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloadDisabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </button>

          <div ref={columnMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowColumnMenu((prev) => !prev)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-3 text-zinc-700 transition-colors hover:bg-zinc-100"
              aria-label="Columns"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-52 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Visible Columns
                </p>
                {columns
                  .filter((column) => column.key !== "title")
                  .map((column) => (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.key]}
                        onChange={() => toggleColumn(column.key)}
                        className="accent-zinc-900"
                      />
                      <span className="text-sm text-zinc-700">{column.label}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SearchBox ကို full-width calm style နဲ့ပေးထားလို့ filter/search controls တွေကို
          header တစ်ခုပဲမှာ compact အနေနဲ့အသုံးပြုနိုင်ပါတယ်။ */}
      <div className="mt-3">
        <Searchbox
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search and press Enter to pick a column"
          filterGroups={filterGroups}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
          columns={columns}
          selectedSearchQueryFilters={selectedSearchQueryFilters}
          setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}
        />
      </div>
    </section>
  );
}
