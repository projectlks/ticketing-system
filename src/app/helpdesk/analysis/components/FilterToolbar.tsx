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
  // Action button state ကိုတစ်နေရာထဲကနေတွက်ထားလို့ rendering rule တိတိကျကျဖြစ်ပြီး
  // နောက်ပိုင်း UX rule တိုးချင်ရင် helper variable တစ်နေရာထဲပြင်လို့ရပါမယ်။
  const applyDisabled =
    !hasPendingFilterChanges || invalidDateRange || isLoading;
  const downloadDisabled =
    hasPendingFilterChanges || invalidDateRange || isLoading;

  return (
    <header className="relative overflow-hidden  border-slate-200 ">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 " />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
              Helpdesk Analytics
            </p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Overview Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Applied range:{" "}
              <span className="font-medium text-slate-800">
                {appliedRangeLabel}
              </span>
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {isLoading
              ? "Refreshing data..."
              : lastUpdatedAt
                ? `Last updated ${lastUpdatedAt}`
                : "Live data"}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-4 sm:p-5 ">
          {/* <div className="rounded-2xl bg-slate-100 p-1.5"> */}
            <div className="flex flex-wrap gap-1.5">
              {quickRangeOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onQuickRange(item.key)}
                  disabled={isLoading}
                  className={`h-9 px-4 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40 ${
                    activeQuickRange === item.key
                      ? "bg-linear-to-r from-slate-900 to-slate-700 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}>
                  {item.label}
                </button>
              ))}
            {/* </div> */}
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                From Date
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => onFromDateChange(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                To Date
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => onToDateChange(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:justify-end gap-2">
              <button
                type="button"
                onClick={onApply}
                disabled={applyDisabled}
                className="h-11 px-4 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors">
                Apply
              </button>

              <button
                type="button"
                onClick={onReset}
                disabled={isLoading}
                className="h-11 px-4 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                Reset
              </button>

              <button
                type="button"
                onClick={onDownload}
                disabled={downloadDisabled}
                className="h-11 px-4 rounded-xl text-sm font-semibold bg-linear-to-r from-cyan-600 to-sky-600 text-white hover:from-cyan-500 hover:to-sky-500 disabled:opacity-40 transition-colors">
                Download CSV
              </button>
            </div>
          </div>

          {invalidDateRange && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              From date must be earlier than or equal to To date.
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          {!invalidDateRange && !errorMessage && hasPendingFilterChanges && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              You changed filters. Click Apply to refresh charts and tables.
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
