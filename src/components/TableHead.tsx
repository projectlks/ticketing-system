import React from "react";

interface TableProps {
    data: string;
}

export default function Table({ data }: TableProps) {
    return (
        <th className="px-5 py-3  dark:bg-gray-800 text-left sm:px-6">
            <div className="font-medium whitespace-nowrap text-[14px] text-gray-500 dark:text-gray-300">
                {data}
            </div>
        </th>
    );
}

// import React from "react";

// interface TableHeadProps {
//   data: string | number;
//   width?: number;
//   textAlign?: "left" | "center" | "right";
// }

// export default function TableHead({ data, width, textAlign = "left" }: TableHeadProps) {
//   const alignmentClass = {
//     left: "text-left",
//     center: "text-center",
//     right: "text-right",
//   }[textAlign];

//   return (
//     <div
//       className={`px-5 py-2.5 sm:px-6 ${alignmentClass} overflow-hidden whitespace-nowrap  max-w-full `}
//       style={{ width }}
//     >
//          <p className="font-medium   text-[14px] text-gray-500 truncate max-w-full  dark:text-gray-300">
//                  {data}
//              </p>
//       {/* {data} */}
//     </div>
//   );
// }

