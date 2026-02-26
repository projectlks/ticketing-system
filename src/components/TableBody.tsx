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
    <td className={`max-w-[420px] px-4 py-3 ${alignmentClass}`}>
      <div className="truncate text-sm text-zinc-700">{data}</div>
    </td>
  );
}
