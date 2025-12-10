// components/SearchBox/SearchBox.tsx

"use client";

import React, { useState } from "react";
import {
    MagnifyingGlassIcon,
    ChevronDownIcon,
    AdjustmentsVerticalIcon,
    TagIcon,
} from "@heroicons/react/24/outline";
import FilterTag from "./FilterTag";
import FilterDropdown from "./FilterDropdown";
import SearchSuggestionDropdown from "./SearchSuggestionDropdown";
import { FilterGroup, Column } from "./types";

interface Props {
    placeholder?: string;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    filterGroups: FilterGroup[];
    className?: string;
    children?: React.ReactNode;
    selectedFilters: Record<string, string[]>;
    setSelectedFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    columns?: Column[];
    selectedSearchQueryFilters: Record<string, string[]>;
    setSelectedSearchQueryFilters: React.Dispatch<
        React.SetStateAction<Record<string, string[]>>
    >;
}

const SearchBox: React.FC<Props> = ({
    placeholder = "Search...",
    searchQuery,
    setSearchQuery,
    filterGroups,
    className = "",
    children,
    selectedFilters,
    setSelectedFilters,
    columns = [],
    selectedSearchQueryFilters,
    setSelectedSearchQueryFilters,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    // -----------------------------
    // Handlers
    // -----------------------------
    const toggleFilter = (group: string, option: string) => {
        setSelectedFilters((prev) => {
            const groupValues = prev[group] || [];
            const updated = groupValues.includes(option)
                ? groupValues.filter((v) => v !== option)
                : [...groupValues, option];
            return { ...prev, [group]: updated };
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!columns.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % columns.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev <= 0 ? columns.length - 1 : prev - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();

            const selected = columns[activeIndex === -1 ? 0 : activeIndex];
            if (!selected) return;

            setSelectedSearchQueryFilters((prev) => ({
                ...prev,
                [selected.label]: [...(prev[selected.label] || []), searchQuery],
            }));

            setSearchQuery("");
            setActiveIndex(-1);
        }
    };

    // -----------------------------
    // Render
    // -----------------------------
    return (
        <div
            className={`relative min-w-[40%] flex flex-wrap items-center border border-gray-300 rounded min-h-[34px] ${className}`}
        >
            {/* Filter tags */}
            {(Object.keys(selectedFilters).length > 0 ||
                Object.keys(selectedSearchQueryFilters).length > 0) && (
                    <div className="pl-5 min-h-full py-[5px]">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedFilters).map(([group, options]) =>
                                options.length ? (
                                    <FilterTag
                                        key={group}
                                        label={group}
                                        options={options}
                                        onRemove={() =>
                                            setSelectedFilters((prev) => {
                                                const updated = { ...prev };
                                                delete updated[group];
                                                return updated;
                                            })
                                        }
                                        icon={<AdjustmentsVerticalIcon className="w-4 h-4 text-indigo-500" />}
                                    />
                                ) : null
                            )}

                            {Object.entries(selectedSearchQueryFilters).map(([group, options]) =>
                                options.length ? (
                                    <FilterTag
                                        key={group}
                                        label={group}
                                        options={options}
                                        onRemove={() =>
                                            setSelectedSearchQueryFilters((prev) => {
                                                const updated = { ...prev };
                                                delete updated[group];
                                                return updated;
                                            })
                                        }
                                        icon={<TagIcon className="w-4 h-4 text-indigo-500" />}
                                    />
                                ) : null
                            )}
                        </div>
                    </div>
                )}

            {/* Search input */}
            <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute top-1/2 left-3 w-4 h-4 text-gray-700 transform -translate-y-1/2 pointer-events-none" />

                <input
                    onKeyDown={handleKeyDown}
                    type="text"
                    placeholder={placeholder}
                    className="h-6 w-full flex-1  pl-9 pr-10 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Toggle filter dropdown */}
            <div
                onClick={() => setShowForm(!showForm)}
                className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-full min-h-[34px] w-[34px] cursor-pointer border-l ${showForm
                    ? "bg-indigo-100 text-indigo-500 border border-indigo-500"
                    : "hover:bg-gray-100 border-gray-300"
                    }`}
            >
                <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-300 ${showForm ? "rotate-180" : ""
                        }`}
                />
            </div>

            {showForm && (
                <FilterDropdown
                    filterGroups={filterGroups}
                    selectedFilters={selectedFilters}
                    toggleFilter={toggleFilter}
                />
            )}

            {searchQuery && (
                <SearchSuggestionDropdown
                    columns={columns}
                    searchQuery={searchQuery}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}
                    setSearchQuery={setSearchQuery}
                />
            )}

            {children}
        </div>
    );
};

export default SearchBox;
