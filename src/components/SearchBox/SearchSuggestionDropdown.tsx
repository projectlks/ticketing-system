import React from "react";
import { Column } from "./types";

interface Props {
  columns: Column[];
  searchQuery: string;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  setSelectedSearchQueryFilters: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >;
  setSearchQuery: (value: string) => void;
}

const SearchSuggestionDropdown: React.FC<Props> = ({
  columns,
  searchQuery,
  activeIndex,
  setActiveIndex,
  setSelectedSearchQueryFilters,
  setSearchQuery,
}) => (
  <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(92vw,640px)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
    {columns.length ? (
      <div className="space-y-1">
        {columns.map((column, index) => (
          <div
            key={column.key}
            className={`flex cursor-pointer flex-wrap items-center gap-2 rounded-md px-3 py-2 text-sm ${
              index === activeIndex
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100"
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => {
              setSelectedSearchQueryFilters((previous) => ({
                ...previous,
                [column.label]: [...(previous[column.label] || []), searchQuery],
              }));
              setSearchQuery("");
            }}
          >
            <p>Search</p>
            <strong>{column.label}</strong>
            <p>for</p>
            <span className="font-medium text-zinc-500">
              &quot;{searchQuery}&quot;
            </span>
          </div>
        ))}
      </div>
    ) : (
      <p className="px-2 text-sm text-zinc-500">No columns available</p>
    )}
  </div>
);

export default SearchSuggestionDropdown;
