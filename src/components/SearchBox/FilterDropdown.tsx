import React from "react";
import { AdjustmentsVerticalIcon } from "@heroicons/react/24/outline";
import { FilterGroup } from "./types";

interface FilterDropdownProps {
  filterGroups: FilterGroup[];
  selectedFilters: Record<string, string[]>;
  toggleFilter: (group: string, option: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filterGroups,
  selectedFilters,
  toggleFilter,
}) => (
  <div className="absolute right-0 top-[calc(100%+8px)] z-20 max-h-[420px] w-[min(92vw,640px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
    <div className="mb-4 flex items-center gap-2">
      <AdjustmentsVerticalIcon className="h-5 w-5 text-zinc-600" />
      <h1 className="text-sm font-semibold text-zinc-900">Filters</h1>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {filterGroups.map((group) => (
        <div key={group.title} className="rounded-lg border border-zinc-200 p-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {group.title}
          </h3>

          <div className="space-y-1">
            {group.options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  checked={selectedFilters[group.title]?.includes(option) || false}
                  onChange={() => toggleFilter(group.title, option)}
                  className="accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FilterDropdown;
