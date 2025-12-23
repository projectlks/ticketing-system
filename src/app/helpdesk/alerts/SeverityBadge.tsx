import React from "react";

// Map severity numbers to labels
export const severityLabel = (s: string) => {
  switch (s) {
    case "0": return "Information";
    case "1": return "Warning";
    case "2": return "Average";
    case "3": return "High";
    case "4": return "Disaster";
    default: return "Unknown";
  }
};

// Map severity numbers to colors
export const severityColor = (s: string) => {
  switch (s) {
    case "0": return "bg-blue-100 text-blue-700";      // Info
    case "1": return "bg-yellow-100 text-yellow-700";  // Warning
    case "2": return "bg-orange-100 text-orange-700";  // Average
    case "3": return "bg-red-200 text-red-800";        // High
    case "4": return "bg-red-700 text-white";          // Disaster
    default: return "bg-gray-100 text-gray-700";
  }
};

export const SeverityBadge: React.FC<{ value: string }> = ({ value }) => (
  <span className={`px-2 py-1  text-xs font-semibold ${severityColor(value)}`}>
    {severityLabel(value)}
  </span>
);
