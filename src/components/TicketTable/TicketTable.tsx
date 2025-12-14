// import React, { useState } from "react";
// import TableHead from "../TableHead";
// // import ColumnSelector from "./ColumnSelector";
// // import TableRow from "./TableRow";
// import { ResizableBox } from "react-resizable";
// import "react-resizable/css/styles.css";
// import { useStatusColor } from "@/hooks/useStatusColor";
// import { usePriorityColor } from "@/hooks/usePriorityColor";

// interface TicketTableProps {
//   columns: { key: string; label: string }[];
//   tickets: any[];
// }

// export default function TicketTable({ columns, tickets }: TicketTableProps) {
//   const [visibleColumns, setVisibleColumns] = useState(
//     Object.fromEntries(columns.map((col) => [col.key, true]))
//   );
//   const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
//   const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
//     Object.fromEntries(columns.map((col) => [col.key, 150]))
//   );

//   const getStatusColor = useStatusColor;
//   const getPriorityColor = usePriorityColor;

//   const toggleSelectTicket = (id: number) => {
//     setSelectedTickets((prev) =>
//       prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
//     );
//   };

//   const toggleSelectAll = () => {
//     setSelectedTickets(
//       selectedTickets.length === tickets.length ? [] : tickets.map((t) => t.id)
//     );
//   };

//   const handleResize = (key: string, width: number) => {
//     setColumnWidths((prev) => ({ ...prev, [key]: width }));
//   };

//   return (
//     <div className="w-full overflow-x-auto bg-white mt-4 border border-gray-200 rounded">
//       {/* Column Selector */}
//       <div className="flex justify-end p-2 pr-4">
//         <ColumnSelector
//           columns={columns}
//           visibleColumns={visibleColumns}
//           toggleColumn={(key) => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
//         />
//       </div>

//       {/* Table Header */}
//       <div className="flex border-b border-gray-200">
//         <div className="w-12 flex items-center justify-center border-r border-gray-200">
//           <input
//             type="checkbox"
//             checked={selectedTickets.length === tickets.length && tickets.length > 0}
//             onChange={toggleSelectAll}
//             className="accent-main"
//           />
//         </div>

//         {columns.map(
//           (col) =>
//             visibleColumns[col.key] && (
//               <ResizableBox
//                 key={col.key}
//                 width={columnWidths[col.key]}
//                 height={40}
//                 axis="x"
//                 minConstraints={[120, 40]}
//                 maxConstraints={[500, 40]}
//                 onResize={(e, data) => handleResize(col.key, data.size.width)}
//                 resizeHandles={["e"]}
//               >
//                 <TableHead data={col.label} width={columnWidths[col.key]} />
//               </ResizableBox>
//             )
//         )}
//       </div>

//       {/* Table Body */}
//       {tickets.map((ticket) => (
//         <TableRow
//           key={ticket.id}
//           ticket={ticket}
//           columns={columns}
//           visibleColumns={visibleColumns}
//           columnWidths={columnWidths}
//           selectedTickets={selectedTickets}
//           toggleSelectTicket={toggleSelectTicket}
//           getStatusColor={getStatusColor}
//           getPriorityColor={getPriorityColor}
//         />
//       ))}
//     </div>
//   );
// }


import React from 'react'

export default function TicketTable() {
  return (
    <div>TicketTable</div>
  )
}
