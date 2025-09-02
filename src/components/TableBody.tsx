import React from "react";

interface TableBodyProps {
    data: string;
    textAlign?: "left" | "center" | "right";
}

export default function TableBody({ data, textAlign = "left" }: TableBodyProps) {
    const alignmentClass = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
    }[textAlign];

    return (
        <td
            className={`px-5 py-4 sm:px-6 ${alignmentClass} max-w-[500px]  `}
        >
            <p className="text-gray-500 dark:text-gray-300 truncate">{data}</p>
        </td>
    );
}
