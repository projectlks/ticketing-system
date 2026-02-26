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
  setSelectedFilters: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >;
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

  const toggleFilter = (group: string, option: string) => {
    setSelectedFilters((previous) => {
      const groupValues = previous[group] || [];
      const updatedValues = groupValues.includes(option)
        ? groupValues.filter((value) => value !== option)
        : [...groupValues, option];

      return { ...previous, [group]: updatedValues };
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!columns.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) => (previous + 1) % columns.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) =>
        previous <= 0 ? columns.length - 1 : previous - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const selectedColumn = columns[activeIndex === -1 ? 0 : activeIndex];
      if (!selectedColumn || !searchQuery.trim()) return;

      setSelectedSearchQueryFilters((previous) => ({
        ...previous,
        [selectedColumn.label]: [
          ...(previous[selectedColumn.label] || []),
          searchQuery,
        ],
      }));

      setSearchQuery("");
      setActiveIndex(-1);
    }
  };

  return (
    <div
      className={`relative flex min-h-10 w-full flex-wrap items-center rounded-xl border border-zinc-200 bg-white ${className}`}
    >
      {(Object.keys(selectedFilters).length > 0 ||
        Object.keys(selectedSearchQueryFilters).length > 0) && (
        <div className="px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedFilters).map(([group, options]) =>
              options.length ? (
                <FilterTag
                  key={group}
                  label={group}
                  options={options}
                  onRemove={() =>
                    setSelectedFilters((previous) => {
                      const updated = { ...previous };
                      delete updated[group];
                      return updated;
                    })
                  }
                  icon={<AdjustmentsVerticalIcon className="h-3.5 w-3.5 text-zinc-500" />}
                />
              ) : null,
            )}

            {Object.entries(selectedSearchQueryFilters).map(([group, options]) =>
              options.length ? (
                <FilterTag
                  key={group}
                  label={group}
                  options={options}
                  onRemove={() =>
                    setSelectedSearchQueryFilters((previous) => {
                      const updated = { ...previous };
                      delete updated[group];
                      return updated;
                    })
                  }
                  icon={<TagIcon className="h-3.5 w-3.5 text-zinc-500" />}
                />
              ) : null,
            )}
          </div>
        </div>
      )}

      <div className="relative flex-1">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

        <input
          onKeyDown={handleKeyDown}
          type="text"
          placeholder={placeholder}
          className="h-9 w-full bg-transparent pl-10 pr-10 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowForm((previous) => !previous)}
        className={`absolute right-0 top-1/2 flex h-full min-h-10 w-10 -translate-y-1/2 items-center justify-center border-l transition-colors ${
          showForm
            ? "border-zinc-300 bg-zinc-100 text-zinc-700"
            : "border-zinc-200 text-zinc-500 hover:bg-zinc-100"
        }`}
      >
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${
            showForm ? "rotate-180" : ""
          }`}
        />
      </button>

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
