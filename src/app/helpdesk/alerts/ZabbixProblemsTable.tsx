"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFetchZabbix } from "@/hooks/useFetchZabbix";
import { ColumnPicker } from "./ColumnPicker";
import TableHead from "@/components/TableHead";
import Body from "./Body";


type ColumnKey =
    | "eventid" | "name" | "severity" | "status" | "clock" | "tags" | "opdata"
    | "r_clock" | "hosts" | "source" | "object" | "objectid" | "suppressed" | "suppression_data";

const columns: { key: ColumnKey; label: string }[] = [
    { key: "eventid", label: "Problem ID" },
    { key: "name", label: "Name" },
    { key: "severity", label: "Severity" },
    { key: "status", label: "Status" },
    { key: "clock", label: "Start Time" },
    { key: "tags", label: "Tags" },
    { key: "opdata", label: "OpData" },
    { key: "r_clock", label: "Resolved Time" },
    { key: "hosts", label: "Hosts" },
    { key: "source", label: "Source" },
    { key: "object", label: "Object" },
    { key: "objectid", label: "Object ID" },
    { key: "suppressed", label: "Suppressed" },
    { key: "suppression_data", label: "Suppression Data" },
];

const defaultVisible: Record<ColumnKey, boolean> = Object.fromEntries(
    columns.map((c) => [c.key, true])
) as Record<ColumnKey, boolean>;

export default function ZabbixProblemsTable() {
    const searchParams = useSearchParams();
    const filter = searchParams.get("filter") ?? "Zabbix";
    const { data: problems, error } = useFetchZabbix(filter);
    const [visibleColumns, setVisibleColumns] = useState(defaultVisible);
    const toggleColumn = (key: ColumnKey) => setVisibleColumns((p) => ({ ...p, [key]: !p[key] }));

    if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center bg-white px-4 py-3 border-b">
                <h1 className="text-lg font-semibold">
                    {filter === "All Alerts" ? "All Alerts" : "Zabbix Problems"} ({problems?.length})
                </h1>
                <ColumnPicker columns={columns} visibleColumns={visibleColumns} toggleColumn={toggleColumn} />
            </div>

            <div className="overflow-x-auto mt-4 rounded border border-gray-200 bg-white">
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {columns.map(col => visibleColumns[col.key] && (

                                <TableHead key={col.key} data={col.label} />
                            ))}
                        </tr>
                    </thead>
                    <tbody>



                        <Body problems={problems} columns={columns} visibleColumns={visibleColumns} formatDate={(timestamp) => new Date(Number(timestamp) * 1000).toLocaleString()}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    );
}
