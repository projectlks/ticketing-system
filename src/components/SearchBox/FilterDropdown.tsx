// components/SearchBox/FilterDropdown.tsx

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
    <div className="absolute top-[calc(100%+5px)] right-0 w-[600px] max-h-[400px] bg-white shadow-lg rounded p-4 overflow-y-auto z-20">
        <div className="flex items-center mb-4 space-x-2">
            <AdjustmentsVerticalIcon className="w-5 h-5 text-indigo-500" />
            <h1 className="font-semibold text-sm">Filters</h1>
        </div>

        <div className=" w-full grid grid-cols-2 gap-4">


            {filterGroups.map((group, index) => (
                <div key={group.title} className={`${(index + 1) % 2 !== 0 ? "border-r border-gray-300" : ""} pr-4`}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {group.title}
                    </h3>

                    {group.options.map((option) => (
                        <label
                            key={option}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                            <input
                                type="checkbox"
                                checked={selectedFilters[group.title]?.includes(option) || false}
                                onChange={() => toggleFilter(group.title, option)}
                                className="accent-main"
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                        </label>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export default FilterDropdown;
