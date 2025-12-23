"use client";

import { Dispatch, SetStateAction } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { ArrowDownIcon } from "@heroicons/react/24/outline";
import Button from "@/components/Button";
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
    setSelectedSearchQueryFilters: Dispatch<SetStateAction<Record<string, string[]>>>;

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
    return (
        <div className="flex justify-between items-center bg-white px-4 py-4 border-b border-gray-300">
            {/* Left */}
            <div className="flex items-center space-x-2">
                <Button click={onNew} buttonLabel="NEW" />
                <h1 className="text-sm text-gray-800">{title}</h1>
            </div>

            {/* Search */}
            <Searchbox
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search ..."
                filterGroups={filterGroups}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                columns={columns}
                selectedSearchQueryFilters={selectedSearchQueryFilters}
                setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}
            />

            {/* Right */}
            <div className="flex items-center space-x-5">
                <Button
                    click={onDownload}
                    buttonLabel={<ArrowDownIcon className="w-4 h-4" />}
                    disabled={downloadDisabled}
                />

                {/* Column selector */}
                <div className="relative h-full group">
                    <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer" />
                    <div className="absolute right-0 w-40 bg-white border border-gray-200 rounded-md shadow-md hidden group-hover:block z-10">
                        {columns
                            .filter((col) => col.key !== "title")
                            .map((col) => (
                                <label
                                    key={col.key}
                                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns[col.key]}
                                        onChange={() => toggleColumn(col.key)}
                                        className="mr-2 accent-main"
                                    />
                                    <span className="capitalize text-xs text-gray-700">
                                        {col.label}
                                    </span>
                                </label>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
