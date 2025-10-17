import React from "react";

interface TableProps {
    data: string;
}

export default function Table({ data }: TableProps) {
    return (
        <th className="px-5 py-3  dark:bg-gray-800 text-left sm:px-6">
            <p className="font-medium whitespace-nowrap text-[14px] text-gray-500 dark:text-gray-300">
                {data}
            </p>
        </th>
    );
}
