export type StatusType = "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELED";

const statusColors: Record<StatusType | "DEFAULT", { bg: string; borderAndText: string }> = {
  NEW: { bg: "bg-purple-500", borderAndText: " text-purple-500" },
  OPEN: { bg: "bg-green-500", borderAndText: " text-green-500" },
  IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: " text-yellow-500" },
  RESOLVED: { bg: "bg-blue-500", borderAndText: " text-blue-500" },
  CLOSED: { bg: "bg-gray-500", borderAndText: " text-gray-500" },
  CANCELED: { bg: "bg-gray-500", borderAndText: " text-gray-500" },
  DEFAULT: { bg: "bg-gray-500", borderAndText: "text-red-500" },
};

export function useStatusColor(status: string, type: "bg" | "borderAndText" = "bg") {
  const key = status as StatusType;
  return statusColors[key]?.[type] ?? statusColors.DEFAULT[type];
}