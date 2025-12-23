import { ZabbixProblem } from "@/types/zabbix";
import React from "react";
import TableBody from "@/components/TableBody";
import { SeverityBadge } from "./SeverityBadge";

type ColumnKey =
    | "eventid" | "name" | "severity" | "status" | "clock" | "tags"
    | "opdata" | "r_clock" | "hosts" | "source" | "object"
    | "objectid" | "suppressed" | "suppression_data";

interface BodyProps {
    problems: ZabbixProblem[] | undefined;
    columns: { key: ColumnKey; label: string }[];
    visibleColumns: Record<ColumnKey, boolean>;
    formatDate: (timestamp: string) => string;

}

export default function Body({
    problems,
    columns,
    visibleColumns,
    formatDate,

}: BodyProps) {
    if (!problems) return null;

    return (
        <>
            {problems.map((p) => {
                const status = p.r_eventid === "0" ? "PROBLEM" : "RESOLVED";

                const rendered: Record<ColumnKey, React.ReactNode> = {
                    eventid: p.eventid,
                    name: p.name,
                    severity: (<SeverityBadge value={p.severity} />

                    ),
                    status: (
                        <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${status === "PROBLEM" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                }`}
                        >
                            {status}
                        </span>
                    ),
                    clock: formatDate(p.clock),
                    tags: (
                        <div className="h-full overflow-x-visible">
                            <div className="flex gap-1 items-center">
                                {p.tags.slice(0, 3).map((t, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[11px] flex space-x-1 bg-blue-100 text-blue-700 rounded-full">
                                        <p>{t.tag}</p>
                                        <p>:</p>
                                        <p>{t.value}</p>
                                    </span>
                                ))}
                                {p.tags.length > 3 && (
                                    <span className="px-2 py-0.5 text-[11px] whitespace-nowrap bg-gray-200 text-gray-700 rounded-full cursor-pointer relative group">
                                        +{p.tags.length - 3} more
                                        <div className="absolute z-999 left-0 top-0 mt-1 w-max max-w-xs p-2 bg-white border border-gray-200 shadow-lg rounded hidden group-hover:flex flex-wrap gap-1">
                                            {p.tags.map((t, i) => (
                                                <span key={i} className="px-2 py-0.5 text-[11px] flex space-x-1 bg-blue-100 text-blue-700 rounded-full">
                                                    <p>{t.tag}</p>
                                                    <p>:</p>
                                                    <p>{t.value}</p>
                                                </span>
                                            ))}
                                        </div>
                                    </span>
                                )}
                            </div>
                        </div>
                    ),
                    opdata: p.opdata || "-",
                    r_clock: formatDate(p.r_clock),
                    hosts: <div>{p.hosts?.map((h) => <div key={h.hostid}>{h.host}</div>) || "-"}</div>,
                    source: p.source ?? "-",
                    object: p.object ?? "-",
                    objectid: p.objectid ?? "-",
                    suppressed: p.suppressed ?? "-",
                    suppression_data: JSON.stringify(p.suppression_data ?? []),
                };

                return (
                    <tr key={p.eventid} className="border-b overflow-visible border-gray-100 hover:bg-gray-50 cursor-pointer">
                        {columns.map((col) =>
                            visibleColumns[col.key] ? (
                                col.key === "tags" ? (
                                    <td key={col.key} className="px-3 py-2 align-top">{rendered.tags}</td>
                                ) : (
                                    <TableBody key={col.key} data={rendered[col.key] as string} />
                                )
                            ) : null
                        )}
                    </tr>
                );
            })}
        </>
    );
}
