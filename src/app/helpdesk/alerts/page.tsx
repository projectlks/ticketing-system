// "use client";

// import React, { useEffect, useState } from "react";
// import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
// import { useSearchParams } from "next/navigation";
// import TableHead from "@/components/TableHead";
// import TableBody from "@/components/TableBody";
// import { ZabbixProblem } from "@/types/zabbix";
// import { getAllZabbixTickets } from "./action";

// /* ================= TYPES ================= */

// type ColumnKey =
//   | "eventid"
//   | "name"
//   | "severity"
//   | "status"
//   | "clock"
//   | "tags"
//   | "opdata"
//   | "r_clock"
//   | "hosts"
//   | "source"
//   | "object"
//   | "objectid"
//   | "suppressed"
//   | "suppression_data";

// /* ================= CONFIG ================= */

// const columns: { key: ColumnKey; label: string }[] = [
//   { key: "eventid", label: "Problem ID" },
//   { key: "name", label: "Name" },
//   { key: "severity", label: "Severity" },
//   { key: "status", label: "Status" },
//   { key: "clock", label: "Start Time" },
//   { key: "tags", label: "Tags" },
//   { key: "opdata", label: "OpData" },
//   { key: "r_clock", label: "Resolved Time" },
//   { key: "hosts", label: "Hosts" },
//   { key: "source", label: "Source" },
//   { key: "object", label: "Object" },
//   { key: "objectid", label: "Object ID" },
//   { key: "suppressed", label: "Suppressed" },
//   { key: "suppression_data", label: "Suppression Data" },
// ];

// const defaultVisible: Record<ColumnKey, boolean> = Object.fromEntries(
//   columns.map((c) => [c.key, true])
// ) as Record<ColumnKey, boolean>;

// /* ================= HELPERS ================= */

// const severityColor = (s: string) => {
//   switch (s) {
//     case "1":
//       return "bg-green-100 text-green-700";
//     case "2":
//       return "bg-yellow-100 text-yellow-700";
//     case "3":
//       return "bg-orange-100 text-orange-700";
//     case "4":
//       return "bg-red-100 text-red-700";
//     default:
//       return "bg-gray-100 text-gray-700";
//   }
// };

// const formatDate = (ts?: string) =>
//   ts ? new Date(Number(ts) * 1000).toLocaleString() : "-";

// /* ================= FETCHERS ================= */

// async function fetchZabbixProblems(): Promise<ZabbixProblem[]> {
//   const res = await fetch("/api/problems");
//   const data = await res.json();
//   if (!res.ok) throw new Error(data.error ?? "Failed");
//   return data.result;
// }
// async function fetchBackendAlerts(): Promise<ZabbixProblem[]> {
//   const res = await getAllZabbixTickets();

//   if (!res.success || !res.data) {
//     throw new Error(res.error ?? "Failed to fetch backend alerts");
//   }

  
  
  


//   return res.data.map((t) => ({
//     eventid: t.eventid,
//     name: t.name,
//     status: t.status,
//     clock: Math.floor(new Date(t.clock).getTime() / 1000).toString(), // UNIX timestamp string
//     tags: t.tags
//       ? t.tags.split(",").map((pair) => {
//           const [tag, value] = pair.split(":");
//           return { tag, value };
//         })
//       : [],
//     opdata: "",
//     r_clock: "",
//     hosts: t.hostName ? [{ hostid: t.id.toString(), host: t.hostName }] : [],
//     source: "",
//     object: "",
//     objectid: "",
//     suppressed: "",
//     suppression_data: [],
//     severity: t.triggerSeverity ?? "0",
//     r_eventid: t.status ,
//     ns: "0",
    
//     // --- Add missing fields ---
//     r_ns: "0",
//     correlationid: "",
//     userid: "",
//     acknowledged: "0",
//     acknowledges: [],
//   }));
// }


// /* ================= COMPONENT ================= */

// export default function ZabbixProblemsTable() {
//   const searchParams = useSearchParams();
//   const filter = searchParams.get("filter") ?? "Zabbix";

//   const [problems, setProblems] = useState<ZabbixProblem[]>([]);
//   const [visibleColumns, setVisibleColumns] = useState(defaultVisible);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   /* ===== CONTROLLER ===== */

//   async function fetchDataByFilter(filter: string) {
//     setLoading(true);
//     setError(null);

//     try {
//       const result =
//         filter === "All Alerts"
//           ? await fetchBackendAlerts()
//           : await fetchZabbixProblems();

//       setProblems(result);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : "Unknown error");
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* ===== EFFECT ===== */

//   useEffect(() => {
//     fetchDataByFilter(filter);

//     if (filter === "All Alerts") return;

//     const id = setInterval(() => fetchDataByFilter(filter), 5000);
//     return () => clearInterval(id);
//   }, [filter]);

//   const toggleColumn = (key: ColumnKey) =>
//     setVisibleColumns((p) => ({ ...p, [key]: !p[key] }));

//   if (loading) return <div className="p-4">Loading...</div>;
//   if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
//     return (
//         <div className="p-4">
//             {/* HEADER */}
//             <div className="flex justify-between items-center bg-white px-4 py-3 border-b">
//                 <h1 className="text-lg font-semibold">
//                     Current Zabbix Problems ({problems?.length})
//                 </h1>

//                 {/* COLUMN PICKER */}
//                 <div className="relative group">
//                     <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer" />
//                     <div className="absolute right-0 w-52 bg-white border rounded shadow mt-0 hidden group-hover:block z-20">
//                         {columns.map((col) => (
//                             <label
//                                 key={col.key}
//                                 className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
//                             >
//                                 <input
//                                     type="checkbox"
//                                     checked={visibleColumns[col.key]}
//                                     onChange={() => toggleColumn(col.key)}
//                                     className="mr-2"
//                                 />
//                                 <span className="text-sm">{col.label}</span>
//                             </label>
//                         ))}
//                     </div>
//                 </div>
//             </div>

//             {/* TABLE */}
//             <div className="overflow-x-auto mt-4 rounded border border-gray-200 bg-white">
//                 <table className="w-full min-w-[1000px]">
//                     <thead className="bg-gray-50 border-b border-gray-200">
//                         <tr>
//                             {columns.map(
//                                 (col) =>
//                                     visibleColumns[col.key] && (
//                                         <TableHead key={col.key} data={col.label} />
//                                     )
//                             )}
//                         </tr>
//                     </thead>

//                     <tbody>
//                         {problems?.map((p) => {
//                             const status = p.r_eventid === "0" ? "PROBLEM" : "RESOLVED";

//                             const rendered: Record<ColumnKey, React.ReactNode> = {
//                                 eventid: p.eventid,
//                                 name: p.name,
//                                 severity: (
//                                     <span
//                                         className={`px-2 py-1 rounded text-xs font-semibold ${severityColor(
//                                             p.severity
//                                         )}`}
//                                     >
//                                         {p.severity}
//                                     </span>
//                                 ),
//                                 status: (
//                                     <span
//                                         className={`px-2 py-1 rounded text-xs font-semibold ${status === "PROBLEM"
//                                             ? "bg-red-100 text-red-700"
//                                             : "bg-green-100 text-green-700"
//                                             }`}
//                                     >
//                                         {status}
//                                     </span>
//                                 ),
//                                 clock: formatDate(p.clock),
//                                 tags: (

//                                     <div className="  h-full  overflow-x-visible">
//                                         {/* Visible tags (up to 3) */}
//                                         <div className="flex gap-1 items-center">
//                                             {p.tags.slice(0, 3).map((t, i) => (
//                                                 <span
//                                                     key={i}
//                                                     className="px-2 py-0.5 text-[11px] flex space-x-1 bg-blue-100 text-blue-700 rounded-full"
//                                                 >
//                                                     <p>{t.tag}</p>
//                                                     <p>:</p>
//                                                     <p>{t.value}</p>
//                                                 </span>
//                                             ))}

//                                             {/* Show +N more if there are more than 3 */}
//                                             {p.tags.length > 3 && (
//                                                 <span className="px-2 py-0.5 text-[11px] whitespace-nowrap bg-gray-200 text-gray-700 rounded-full cursor-pointer relative group">
//                                                     +{p.tags.length - 3} more

//                                                     {/* Tooltip with all tags */}
//                                                     <div className="absolute z-999 left-0 top-0 mt-1 w-max max-w-xs p-2 bg-white border border-gray-200 shadow-lg rounded hidden group-hover:flex flex-wrap gap-1 ">
//                                                         {p.tags.map((t, i) => (
//                                                             <span
//                                                                 key={i}
//                                                                 className="px-2 py-0.5 text-[11px] flex space-x-1 bg-blue-100 text-blue-700 rounded-full"
//                                                             >
//                                                                 <p>{t.tag}</p>
//                                                                 <p>:</p>
//                                                                 <p>{t.value}</p>
//                                                             </span>
//                                                         ))}
//                                                     </div>
//                                                 </span>
//                                             )}
//                                         </div>
//                                     </div>

//                                 ),
//                                 opdata: p.opdata || "-",
//                                 r_clock: formatDate(p.r_clock),
//                                 hosts: (
//                                     <div>
//                                         {p.hosts?.map((h) => (
//                                             <div key={h.hostid}>{h.host}</div>
//                                         )) || "-"}
//                                     </div>
//                                 ),
//                                 source: p.source ?? "-",
//                                 object: p.object ?? "-",
//                                 objectid: p.objectid ?? "-",
//                                 suppressed: p.suppressed ?? "-",
//                                 suppression_data: JSON.stringify(p.suppression_data ?? []),
//                             };

//                             return (
//                                 <tr
//                                     key={p.eventid}
//                                     className="border-b overflow-visible border-gray-100 hover:bg-gray-50 cursor-pointer"
//                                 >
//                                     {columns.map((col) =>
//                                         visibleColumns[col.key] ? (
//                                             col.key === "tags" ? (
//                                                 <div
//                                                     key={col.key}
//                                                     className="px-3 py-2 align-top"
//                                                 >
//                                                     {rendered.tags}
//                                                 </div>
//                                             ) : (
//                                                 <TableBody
//                                                     key={col.key}
//                                                     data={rendered[col.key] as string}
//                                                 />
//                                             )
//                                         ) : null
//                                     )}
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// }


import React from 'react'
import ZabbixProblemsTable from './ZabbixProblemsTable'

export default function page() {
  return (
   <ZabbixProblemsTable />
  )
}

