"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { ZabbixProblem } from "@/types/zabbix";

// ===========================
// TYPES
// ===========================
// type ZabbixTag = {
//     tag: string;
//     value: string;
// };

// type ZabbixHost = {
//     hostid: string;
//     host: string;
// };

// type ZabbixProblem = {
//     eventid: string;
//     name: string;
//     severity: string;
//     clock: string;
//     r_eventid: string;
//     r_clock?: string;
//     source?: number;
//     object?: number;
//     objectid?: string;
//     acknowledges?:  ss;
//     suppressed?: string;
//     suppression_data?: any[];
//     opdata?: string;
//     hosts?: ZabbixHost[];
//     tags: ZabbixTag[];
// };

// ===========================
// COLUMNS
// ===========================



type ColumnKey =
    | "eventid" | "name" | "severity" | "status" | "clock" | "tags"
    | "opdata" | "r_clock" | "hosts" | "source" | "object" | "objectid"
    | "suppressed" | "suppression_data";

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

// Define only the main columns
// const columns: { key: ColumnKey; label: string }[] = [
//     { key: "eventid", label: "Problem ID" },
//     { key: "name", label: "Name" },
//     { key: "severity", label: "Severity" },
//     { key: "status", label: "Status" },
//     { key: "clock", label: "Start Time" },
//     { key: "tags", label: "Tags" },
// ];

// Default visible: show only main columns
const defaultVisible: Record<ColumnKey, boolean> = {
    eventid: true,
    name: true,
    severity: true,
    status: true,
    clock: true,
    tags: true,

    // hidden by default
    opdata: false,
    r_clock: false,
    hosts: false,
    source: false,
    object: false,
    objectid: false,
    suppressed: false,
    suppression_data: false,
};


// UI HELPERS
// ===========================
const severityColor = (s: string) => {
    switch (s) {
        case "1": return "bg-green-100 text-green-700";
        case "2": return "bg-yellow-100 text-yellow-700";
        case "3": return "bg-orange-100 text-orange-700";
        case "4": return "bg-red-100 text-red-700";
        default: return "bg-gray-100 text-gray-700";
    }
};

// ===========================
// MAIN COMPONENT
// ===========================
export default function ZabbixProblemsTable() {
    const [problems, setProblems] = useState<ZabbixProblem[]>([]);
    const [visibleColumns, setVisibleColumns] = useState(defaultVisible);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
        Object.fromEntries(columns.map((c) => [c.key, 180]))
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const previousRef = useRef<ZabbixProblem[]>([]);

    // Detect changes between fetches
    // function detectChanges(oldList: ZabbixProblem[], newList: ZabbixProblem[]) {
    //     const oldIds = new Set(oldList.map(p => p.eventid));
    //     const newIds = new Set(newList.map(p => p.eventid));

    //     return {
    //         added: newList.filter(p => !oldIds.has(p.eventid)),
    //         removed: oldList.filter(p => !newIds.has(p.eventid)),
    //         updated: newList.filter(p => {
    //             const old = oldList.find(o => o.eventid === p.eventid);
    //             return old && (
    //                 old.severity !== p.severity ||
    //                 old.name !== p.name ||
    //                 old.r_eventid !== p.r_eventid
    //             );
    //         })
    //     };
    // }

    async function fetchProblems() {
        try {
            const res = await fetch("/api/problems");


            // alert(res)



            const data = await res.json();
 
    console.log("Fetched result:", data);


            if (!res.ok) throw new Error(data.error ?? "Failed");

            // const newList = (data.result ?? []).sort(
            //     (a: ZabbixProblem, b: ZabbixProblem) => Number(b.eventid) - Number(a.eventid)
            // );

            // const oldList = previousRef.current;
            // if (oldList.length) {
            //     const diff = detectChanges(oldList, newList);
            //     if (diff.added.length || diff.removed.length || diff.updated.length) {
            //         console.log("Zabbix change:", diff);
            //     }
            // }

            // previousRef.current = newList;
            setProblems(data.result);


            // alert(data.result)
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

    const toggleColumn = (key: string) =>
        setVisibleColumns((prev) => ({
            ...prev,
            [key]: !prev[key as keyof typeof prev],
        }));

    const handleResize = (key: string, width: number) =>
        setColumnWidths((prev) => ({ ...prev, [key]: width }));

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">Error: {error}</div>;


    return (
        <div className="p-4">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white px-4 py-3 border-b">
                <h1 className="text-lg font-semibold">Current Zabbix Problems ( {problems?.length} )</h1>

                {/* COLUMN PICKER */}
                <div className="relative group">
                    <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer" />
                    <div className="absolute right-0 w-52 bg-white border rounded shadow hidden group-hover:block z-20">
                        {columns.map((col) => (
                            <label key={col.key} className="flex items-center px-3 py-2 hover:bg-gray-100">
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
            <div className="mt-4 border rounded bg-white overflow-x-auto">
                {/* HEADER */}
                <div className="flex bg-gray-50 border-b">
                    {columns.map((col) =>
                        visibleColumns[col.key] ? (
                            <ResizableBox
                                key={col.key}
                                width={columnWidths[col.key]}
                                height={40}
                                axis="x"
                                minConstraints={[140, 40]}
                                resizeHandles={["e"]}
                                onResize={(e, d) => handleResize(col.key, d.size.width)}
                            >
                                <div
                                    className="px-4 py-2 text-xs font-semibold uppercase text-gray-600 truncate border-r"
                                    style={{ width: columnWidths[col.key] }}
                                >
                                    {col.label}
                                </div>
                            </ResizableBox>
                        ) : null
                    )}
                </div>

                {/* BODY */}
                {problems.map((p) => {
                    const status = p.r_eventid === "0" ? "PROBLEM" : "RESOLVED";

                    return (
                        <div key={p.eventid} className="flex border-b  hover:bg-gray-50">
                            {columns.map((col) => {
                                if (!visibleColumns[col.key]) return null;

                                const rendered: Record<string, React.ReactNode> = {
                                    eventid: p.eventid,
                                    name: p.name,
                                    severity: (
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${severityColor(p.severity)}`}>
                                            Severity {p.severity}
                                        </span>
                                    ),
                                    status: (
                                        <span className={`px-2 py-1 rounded text-xs font-semibold 
                                            ${status === "PROBLEM" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                            {status}
                                        </span>
                                    ),
                                    clock: new Date(Number(p.clock) * 1000).toLocaleString(),
                                    tags: (
                                        <div className="flex flex-wrap gap-1">
                                            {p.tags.map((t, i) => (
                                                <span key={i} className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full">
                                                    {t.tag}:{t.value}
                                                </span>
                                            ))}
                                        </div>
                                    ),

                                    // Extra fields
                                    opdata: p.opdata || "-",
                                    r_clock: p.r_clock ? new Date(Number(p.r_clock) * 1000).toLocaleString() : "-",
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
                                    <div
                                        key={col.key}
                                        className="px-4 py-2 text-sm truncate border-r"
                                        style={{ width: columnWidths[col.key] }}
                                    >
                                        {rendered[col.key]}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
