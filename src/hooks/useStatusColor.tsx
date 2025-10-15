//    type StatusType = "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELED";

//     const statusColors: Record<StatusType | "DEFAULT", { bg: string; borderAndText: string }> = {
//         NEW: { bg: "bg-purple-500", borderAndText: "border-purple-500 text-purple-500" },
//         OPEN: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
//         IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
//         RESOLVED: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
//         CLOSED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
//         CANCELED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
//         DEFAULT: { bg: "bg-gray-500", borderAndText: "border-red-500 text-red-500" },
//     };

//     function getStatusColor(
//         status: string,
//         type: "bg" | "borderAndText" = "bg"
//     ): string {
//         const key = status as StatusType;
//         return statusColors[key]?.[type] ?? statusColors.DEFAULT[type];
//     }
export type StatusType = "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELED";

const statusColors: Record<StatusType | "DEFAULT", { bg: string; borderAndText: string }> = {
  NEW: { bg: "bg-purple-500", borderAndText: "border-purple-500 text-purple-500" },
  OPEN: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
  IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
  RESOLVED: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
  CLOSED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
  CANCELED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
  DEFAULT: { bg: "bg-gray-500", borderAndText: "border-red-500 text-red-500" },
};

export function useStatusColor(status: string, type: "bg" | "borderAndText" = "bg") {
  const key = status as StatusType;
  return statusColors[key]?.[type] ?? statusColors.DEFAULT[type];
}
