// components/SearchBox/SearchSuggestionDropdown.tsx

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
  setSearchQuery: (v: string) => void;
}

const SearchSuggestionDropdown: React.FC<Props> = ({
  columns,
  searchQuery,
  activeIndex,
  setActiveIndex,
  setSelectedSearchQueryFilters,
  setSearchQuery,
}) => (
  <div className="absolute top-[calc(100%+5px)] left-0 w-[600px] bg-white shadow-lg rounded-lg p-4 overflow-y-auto z-20 border border-gray-200">
    {columns.length ? (
      <div className="space-y-1">
        {columns.map((col, idx) => (
          <div
            key={col.key}
            className={`text-sm px-3 py-2 cursor-pointer flex flex-wrap items-center gap-2 rounded ${
              idx === activeIndex
                ? "bg-gray-200 text-gray-900"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onClick={() => {
              setSelectedSearchQueryFilters((prev) => ({
                ...prev,
                [col.label]: [...(prev[col.label] || []), searchQuery],
              }));
              setSearchQuery("");
            }}
          >
            <p>Search</p>
            <h1 className="font-semibold">{col.label}</h1>
            <p>for:</p>
            <span className="font-semibold italic">{searchQuery}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 text-sm px-3">No columns available</p>
    )}
  </div>
);

export default SearchSuggestionDropdown;
