import { ZabbixProblem } from "@/types/zabbix";
import React from "react";
import TableBody from "@/components/TableBody";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { Tags } from "./Tags";

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
  if (!problems?.length) return null;

  const reactCellClassByColumn: Partial<Record<ColumnKey, string>> = {
    severity: "min-w-[140px]",
    status: "min-w-[130px]",
    tags: "min-w-[280px] max-w-[360px]",
  };

  return (
    <>
      {problems.map((problem) => {
        const rendered: Record<ColumnKey, React.ReactNode> = {
          eventid: problem.eventid,
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
            className="border-b border-zinc-100 transition-colors hover:bg-zinc-50">
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
