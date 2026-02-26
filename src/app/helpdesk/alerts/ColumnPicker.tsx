import React, { useEffect, useRef, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

type ColumnKey =
  | "eventid" | "name" | "severity" | "status" | "clock" | "tags" | "opdata"
  | "r_clock" | "hosts" | "source" | "object" | "objectid" | "suppressed" | "suppression_data";

type Column = { key: ColumnKey; label: string };

type Props = {
  columns: Column[];
  visibleColumns: Record<ColumnKey, boolean>;
  toggleColumn: (key: ColumnKey) => void;
};

export const ColumnPicker: React.FC<Props> = ({
  columns,
  visibleColumns,
  toggleColumn,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    // Dropdown ပွင့်နေချိန် outside click နဲ့ ESC ကိုစောင့်ပြီးပိတ်ပေးထားလို့
    // table control UX က modal မဟုတ်ပဲ natural flow နဲ့ဆက်သုံးနိုင်ပါတယ်။
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        aria-label="Visible columns"
        aria-expanded={open}>
        <AdjustmentsHorizontalIcon className="h-4 w-4" />
        Columns
        <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            Visible Columns
          </p>

          {columns.map((column) => (
            <label
              key={column.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
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
  );
};
