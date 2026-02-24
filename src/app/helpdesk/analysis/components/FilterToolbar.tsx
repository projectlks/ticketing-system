"use client";

import { type QuickRange, quickRangeOptions } from "../filter-range";

type FilterToolbarProps = {
  appliedRangeLabel: string;
  activeQuickRange: QuickRange;
  fromDate: string;
  toDate: string;
  isLoading: boolean;
  invalidDateRange: boolean;
  hasPendingFilterChanges: boolean;
  errorMessage: string | null;
  lastUpdatedAt: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onDownload: () => void;
  onQuickRange: (range: Exclude<QuickRange, "custom">) => void;
};

export default function FilterToolbar({
  appliedRangeLabel,
  activeQuickRange,
  fromDate,
  toDate,
  isLoading,
  invalidDateRange,
  hasPendingFilterChanges,
  errorMessage,
  lastUpdatedAt,
  onFromDateChange,
  onToDateChange,
  onApply,
  onReset,
  onDownload,
  onQuickRange,
}: FilterToolbarProps) {
  // Toolbar component မှာ filter input + quick ranges + action buttons ကိုစုထားလို့
  // page container က state/logic ကိုပဲကြည့်ရတဲ့ separation ရပါတယ်။
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Helpdesk Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Applied range: {appliedRangeLabel}</p>
          </div>

          <div className="text-xs text-gray-500">
            {isLoading ? "Refreshing data..." : lastUpdatedAt ? `Last updated ${lastUpdatedAt}` : "Live data"}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 p-4">
          <div className="flex flex-wrap gap-2">
            {quickRangeOptions.map((item) => (
              <button
                key={item.key}
                onClick={() => onQuickRange(item.key)}
                className={`h-9 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeQuickRange === item.key
                    ? "bg-black text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="text-sm font-medium text-gray-700">
              From Date
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              To Date
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
              />
            </label>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                onClick={onApply}
                disabled={!hasPendingFilterChanges || invalidDateRange || isLoading}
                className="h-10 px-4 rounded-xl text-sm font-medium bg-black text-white disabled:opacity-40"
              >
                Apply
              </button>
              <button
                onClick={onReset}
                disabled={isLoading}
                className="h-10 px-4 rounded-xl text-sm font-medium border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
              >
                Reset
              </button>
              <button
                onClick={onDownload}
                disabled={hasPendingFilterChanges || invalidDateRange || isLoading}
                className="h-10 px-4 rounded-xl text-sm font-medium bg-gray-900 text-white disabled:opacity-40"
              >
                Download CSV
              </button>
            </div>
          </div>

          {invalidDateRange && (
            <p className="mt-3 text-sm text-red-600">
              From date must be earlier than or equal to To date.
            </p>
          )}

          {errorMessage && (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </header>
  );
}
