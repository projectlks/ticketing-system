"use client";

import { CalendarIcon } from "@heroicons/react/24/outline";

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  setFromDate: (date: string) => void;
  setToDate: (date: string) => void;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      {/* From Date */}
      <div className="flex-1">
        <div className="relative">
          <CalendarIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              const newFrom = e.target.value;
              setFromDate(newFrom);

              // Adjust toDate if it's before fromDate
              if (toDate && newFrom > toDate) {
                setToDate(newFrom);
              }
            }}
            className="w-full pl-8 pr-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded transition-colors 
              text-gray-800 dark:text-gray-100 
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              bg-white dark:bg-gray-900
              focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
            placeholder="From"
          />
        </div>
      </div>

      {/* Separator */}
      <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>

      {/* To Date */}
      <div className="flex-1">
        <div className="relative">
          <CalendarIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={new Date().toISOString().split("T")[0]}
            disabled={!fromDate}
            onChange={(e) => {
              const newTo = e.target.value;
              if (newTo >= fromDate) setToDate(newTo);
              else console.warn("To date cannot be earlier than From date");
            }}
            className={`w-full pl-8 pr-2 py-2 text-xs border rounded transition-colors 
              ${
                !fromDate
                  ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
              }`}
            placeholder="To"
          />
        </div>
      </div>
    </div>
  );
}
