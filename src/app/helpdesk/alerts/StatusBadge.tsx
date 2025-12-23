import React from "react";

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isProblem = status === "0" || status === "PROBLEM";
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        isProblem ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {isProblem ? "PROBLEM" : "RESOLVED"}
    </span>
  );
};
