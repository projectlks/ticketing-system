"use client";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface TableFooterProps {
    pageSize: number;
    setPageSize: (size: number) => void;
    currentPage: number;
    setCurrentPage: (page: number | ((p: number) => number)) => void;
    totalPages: number;
}

export default function TableFooter({
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
}: TableFooterProps) {
    const [open, setOpen] = useState(false);
    const pageSizes = [5, 10, 15, 20, 25];

    const handleSelect = (size: number) => {
        setPageSize(size);
        setCurrentPage(1);
        setOpen(false);
    };

    return (
        <div className="flex justify-end mt-4">
            <div className="flex items-center space-x-2">
                {/* Page Size Selector */}
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show:</span>
                    <div className="relative">
                        <div
                            className={`border flex items-center justify-between border-gray-300 rounded px-2 py-1 text-sm w-[60px] cursor-pointer ${open ? 'bg-gray-100 border-indigo-300 ' : ''}`}
                            onClick={() => setOpen((prev) => !prev)}
                        >
                            <span>{pageSize}</span>
                            <ChevronDownIcon className={`h-4 w-4 transition-all ${open ? 'rotate-180' : ''}`} />
                        </div>

                        {open && (
                            <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded shadow z-10">
                                {pageSizes.map((size) => (
                                    <div
                                        key={size}
                                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => handleSelect(size)}
                                    >
                                        {size}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>

                    <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
