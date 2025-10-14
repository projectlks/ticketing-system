"use client";

import { Dispatch, SetStateAction, useState, useRef, useEffect } from "react";
import { AdjustmentsVerticalIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Add "Viewed" to support Seen / Unseen filtering
const filterKeys = ["Status", "Priority", "Assigned", "Viewed"];

interface Props {
    filters: { key: string; value: string }[];
    setFilters: Dispatch<SetStateAction<{ key: string; value: string }[]>>;
}

export default function MultiFilter({ filters, setFilters }: Props) {
    const [show, setShow] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string>("Status");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const addFilter = (value: string) => {
        if (!selectedKey) return;
        setFilters(prev => [
            ...prev.filter(f => f.key !== selectedKey),
            { key: selectedKey, value }
        ]);
    };

    const removeFilter = (key: string) => setFilters(prev => prev.filter(f => f.key !== key));
    const clearFilters = () => setFilters([]);

    const getFilterOptions = (key: string) => {
        switch (key) {
            case "Status":
                return ["Open", "In Progress", "Resolved", "Closed", ""];
            case "Priority":
                return ["REQUEST", "MINOR", "MAJOR", "CRITICAL", ""];
            case "Assigned":
                return ["Assigned", "Not Assigned", ""];
            case "Viewed":
                return ["Seen", "Unseen", ""];
            default:
                return [];
        }
    };

    const currentFilter = filters.find(f => f.key === selectedKey)?.value || "";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShow(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            {/* Filter Button */}
            <div
                onClick={() => setShow(!show)}
                className="h-[34px] aspect-square bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center rounded cursor-pointer"
            >
                <AdjustmentsVerticalIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>

            {show && (
                <div className="absolute right-0 mt-2 z-10 w-[600px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 px-5 py-2">
                        <span className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
                            <p className="whitespace-nowrap">Multi Filters</p>
                        </span>

                        <div className="flex flex-1 flex-wrap gap-2 ml-5">
                            {filters.map(f => (
                                <div
                                    key={f.key}
                                    className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-200"
                                >
                                    <span>{f.key}: {f.value || "-"}</span>
                                    <XMarkIcon
                                        className="w-3 h-3 cursor-pointer text-gray-600 dark:text-gray-300"
                                        onClick={() => removeFilter(f.key)}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={clearFilters}
                            className="text-xs whitespace-nowrap border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Filter Content */}
                    <div className="flex py-5">
                        {/* Filter Keys */}
                        <ul className="w-[150px] text-xs px-2 space-y-1 border-r border-gray-300 dark:border-gray-700">
                            {filterKeys.map(key => (
                                <li
                                    key={key}
                                    onClick={() => setSelectedKey(key)}
                                    className={`cursor-pointer px-3 py-2 flex justify-between items-center rounded 
                                        ${selectedKey === key
                                            ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold"
                                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        }`}
                                >
                                    <span>{key}</span>
                                    {filters.some(f => f.key === key) && (
                                        <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    )}
                                </li>
                            ))}
                        </ul>

                        {/* Filter Options */}
                        <div className="flex-1 px-5 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                {getFilterOptions(selectedKey).map(val => (
                                    <label
                                        key={val || "empty"}
                                        className={`flex items-center text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 cursor-pointer 
                                            ${currentFilter === val
                                                ? "bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={selectedKey}
                                            value={val}
                                            className="mr-2"
                                            checked={currentFilter === val}
                                            onChange={() => addFilter(val)}
                                        />
                                        {val || "Clear"}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
