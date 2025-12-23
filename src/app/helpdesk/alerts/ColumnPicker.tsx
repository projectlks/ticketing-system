import React from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

type ColumnKey =
  | "eventid" | "name" | "severity" | "status" | "clock" | "tags" | "opdata"
  | "r_clock" | "hosts" | "source" | "object" | "objectid" | "suppressed" | "suppression_data";

type Column = { key: ColumnKey; label: string };

type Props = {
  columns: Column[];
  visibleColumns: Record<ColumnKey, boolean>;
  toggleColumn: (key: ColumnKey) => void;
};

export const ColumnPicker: React.FC<Props> = ({ columns, visibleColumns, toggleColumn }) => (
  <div className="relative group">
    <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer" />
    <div className="absolute right-0 w-52 bg-white border rounded shadow mt-0 hidden group-hover:block z-20">
      {columns.map((col) => (
        <label
          key={col.key}
          className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={visibleColumns[col.key]}
            onChange={() => toggleColumn(col.key)}
            className="mr-2"
          />
          <span className="text-sm">{col.label}</span>
        </label>
      ))}
    </div>
  </div>
);
