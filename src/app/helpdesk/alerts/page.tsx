"use client";

import React, { useEffect, useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { ZabbixProblem } from "@/types/zabbix";
import TableHead from "@/components/TableHead";
import TableBody from "@/components/TableBody";

type ColumnKey =
    | "eventid"
    | "name"
    | "severity"
    | "status"
    | "clock"
    | "tags"
    | "opdata"
    | "r_clock"
    | "hosts"
    | "source"
    | "object"
    | "objectid"
    | "suppressed"
    | "suppression_data";

const columns: { key: ColumnKey; label: string }[] = [
    { key: "eventid", label: "Problem ID" },
    { key: "name", label: "Name" },
    { key: "severity", label: "Severity" },
    { key: "status", label: "Status" },
    { key: "clock", label: "Start Time" },
    { key: "tags", label: "Tags" },
    { key: "opdata", label: "Operational Data" },
    { key: "r_clock", label: "Resolved Time" },
    { key: "hosts", label: "Hosts" },
    { key: "source", label: "Source" },
    { key: "object", label: "Object" },
    { key: "objectid", label: "Object ID" },
    { key: "suppressed", label: "Suppressed" },
    { key: "suppression_data", label: "Suppression Data" },
];

const defaultVisible: Record<ColumnKey, boolean> = {
    eventid: true,
    name: true,
    severity: true,
    status: true,
    clock: true,
    tags: true,
    opdata: false,
    r_clock: false,
    hosts: false,
    source: false,
    object: false,
    objectid: false,
    suppressed: false,
    suppression_data: false,
};

const severityColor = (s: string) => {
    switch (s) {
        case "1":
            return "bg-green-100 text-green-700";
        case "2":
            return "bg-yellow-100 text-yellow-700";
        case "3":
            return "bg-orange-100 text-orange-700";
        case "4":
            return "bg-red-100 text-red-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
};

const formatDate = (timestamp?: string) => {
    if (!timestamp) return "-";
    return new Date(Number(timestamp) * 1000).toISOString();
};

export default function ZabbixProblemsTable() {
    const [problems, setProblems] = useState<ZabbixProblem[]>([]);
    const [visibleColumns, setVisibleColumns] = useState(defaultVisible);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // const previousRef = useRef<ZabbixProblem[]>([]);

    async function fetchProblems() {
        try {
            const res = await fetch("/api/problems");
            const data = await res.json();

            if (!res.ok) throw new Error(data.error ?? "Failed");

            setProblems(data.result);
            setError(null);
        } catch (e) {
            if (e instanceof Error) setError(e.message);
            else setError("Unknown error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProblems();
        const id = setInterval(fetchProblems, 5000);
        return () => clearInterval(id);
    }, []);

    const toggleColumn = (key: ColumnKey) =>
        setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

    return (
        <div className="p-4">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white px-4 py-3 border-b">
                <h1 className="text-lg font-semibold">
                    Current Zabbix Problems ( {problems?.length} )
                </h1>

                {/* COLUMN PICKER */}
                <div className="relative group">
                    <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer" />
                    <div className="absolute right-0 w-52 bg-white border rounded shadow hidden group-hover:block z-20">
                        {columns.map((col) => (
                            <label
                                key={col.key}
                                className="flex items-center px-3 py-2 hover:bg-gray-100"
                            >
                                <input
                                    type="checkbox"
                                    checked={visibleColumns[col.key]}
                                    onChange={() => toggleColumn(col.key)}
                                    className="mr-2"
                                />
                                <span className="text-sm">{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <table className="w-full overflow-x-auto bg-white mt-4 border border-gray-200 rounded">
                <thead className="border-b border-gray-200">
                    <tr>
                        {columns.map(
                            (col) =>
                                visibleColumns[col.key] && (
                                    <TableHead key={col.key} data={col.label} />
                                )
                        )}
                    </tr>
                </thead>

                <tbody>
                    {problems.map((p) => {
                        const status = p.r_eventid === "0" ? "PROBLEM" : "RESOLVED";

                        const rendered: Record<ColumnKey, React.ReactNode> = {
                            eventid: p.eventid,
                            name: p.name,
                            severity: (
                                <span
                                    className={`px-2 py-1 rounded text-xs font-semibold ${severityColor(
                                        p.severity
                                    )}`}
                                >
                                    Severity {p.severity}
                                </span>
                            ),
                            status: (
                                <span
                                    className={`px-2 py-1 rounded text-xs font-semibold ${status === "PROBLEM"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                        }`}
                                >
                                    {status}
                                </span>
                            ),
                            clock: formatDate(p.clock),
                            tags: (
                                <div className="flex flex-wrap gap-1">
                                    {p.tags.map((t, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full"
                                        >
                                            {t.tag}:{t.value}
                                        </span>
                                    ))}
                                </div>
                            ),
                            opdata: p.opdata || "-",
                            r_clock: formatDate(p.r_clock),
                            hosts: (
                                <div>
                                    {p.hosts?.map((h) => (
                                        <div key={h.hostid}>{h.host}</div>
                                    )) || "-"}
                                </div>
                            ),
                            source: p.source ?? "-",
                            object: p.object ?? "-",
                            objectid: p.objectid ?? "-",
                            suppressed: p.suppressed ?? "-",
                            suppression_data: JSON.stringify(p.suppression_data ?? []),
                        };

                        return (
                            <tr
                                key={p.eventid}
                                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            >
                                {columns.map(
                                    (col) =>
                                        visibleColumns[col.key] && (
                                            <TableBody
                                                key={col.key}
                                                data={rendered[col.key] as string}
                                            />
                                        )
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
