import { ZabbixProblem } from "@/types/zabbix";
import React from "react";
import TableBody from "@/components/TableBody";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { Tags } from "./Tags";

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

interface BodyProps {
  problems: ZabbixProblem[] | undefined;
  columns: { key: ColumnKey; label: string }[];
  visibleColumns: Record<ColumnKey, boolean>;
  formatDate: (timestamp: string) => string;
  changeMap?: Record<string, "new" | "updated">;
}

export default function Body({
  problems,
  columns,
  visibleColumns,
  formatDate,
  changeMap,
}: BodyProps) {
  if (!problems?.length) return null;

  const reactCellClassByColumn: Partial<Record<ColumnKey, string>> = {
    severity: "min-w-[140px]",
    status: "min-w-[130px]",
    tags: "min-w-[280px] max-w-[360px]",
  };

  return (
    <>
      {problems.map((problem) => {
        const changeType = changeMap?.[problem.eventid];
        const rowHighlightClass =
          changeType === "new"
            ? "bg-emerald-50/70 hover:bg-emerald-100/60"
            : changeType === "updated"
              ? "bg-amber-50/70 hover:bg-amber-100/60"
              : "hover:bg-zinc-50";
        const changeBadgeClass =
          changeType === "new"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700";
        const rendered: Record<ColumnKey, React.ReactNode> = {
          eventid: (
            <div className="relative pr-16">
              <span className="block truncate">{problem.eventid}</span>
              {changeType && (
                <span
                  className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${changeBadgeClass}`}>
                  {changeType === "new" ? "New" : "Updated"}
                </span>
              )}
            </div>
          ),
          name: problem.name,
          severity: <SeverityBadge value={problem.severity} />,
          status: <StatusBadge status={problem.r_eventid} />,
          clock: formatDate(problem.clock),
          tags: <Tags tags={problem.tags} />,
          opdata: problem.opdata || "-",
          r_clock: formatDate(problem.r_clock),
          hosts: problem.hosts?.map((host) => host.host).join(", ") || "-",
          source: problem.source || "-",
          object: problem.object || "-",
          objectid: problem.objectid || "-",
          suppressed: problem.suppressed || "-",
          suppression_data:
            problem.suppression_data?.length > 0
              ? JSON.stringify(problem.suppression_data)
              : "-",
        };

        return (
          <tr
            key={problem.eventid}
            className={`border-b border-zinc-100 transition-colors ${rowHighlightClass}`}>
            {columns.map((column) => {
              if (!visibleColumns[column.key]) return null;

              const cell = rendered[column.key];

              // JSX node ကို render လိုတဲ့ cell တွေမှာ TableBody truncate logic မသုံးပဲ
              // custom layout နဲ့ render လုပ်ပေးထားလို့ badge/tag UI မပျက်ပဲနေစေပါတယ်။
              if (React.isValidElement(cell)) {
                return (
                  <td
                    key={`${problem.eventid}-${column.key}`}
                    className={`px-4 py-3 align-top whitespace-nowrap ${
                      reactCellClassByColumn[column.key] ?? "min-w-[120px]"
                    }`}>
                    {cell}
                  </td>
                );
              }

              return (
                <TableBody
                  key={`${problem.eventid}-${column.key}`}
                  data={String(cell ?? "-")}
                />
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
