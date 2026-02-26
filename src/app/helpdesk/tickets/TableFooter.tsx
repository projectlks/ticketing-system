"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface TableFooterProps {
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((page: number) => number)) => void;
  totalPages: number;
}

export default function TableFooter({
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
}: TableFooterProps) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setPageSize(nextSize);
              setCurrentPage(1);
            }}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
          >
            {[5, 10, 15, 20, 25].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          <p className="text-sm text-zinc-600">
            Page <span className="font-semibold text-zinc-900">{currentPage}</span> of{" "}
            <span className="font-semibold text-zinc-900">{safeTotalPages}</span>
          </p>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.min(safeTotalPages, page + 1))
            }
            disabled={currentPage >= safeTotalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
