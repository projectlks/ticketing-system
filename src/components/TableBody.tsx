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
        <td
            className={`px-5 py-2.5 sm:px-6 ${alignmentClass} max-w-[500px]  `}
        >
            <div className="text-gray-500 text-[14px] dark:text-gray-300 truncate">{data}</div>
        </td>
    );
}



// import React from "react";

// interface TableBodyProps {
//   data: string | number;
//   width?: number; // header column width ကို prop အဖြစ်ပေးမယ်
//   textAlign?: "left" | "center" | "right";
// }

// export default function TableBody({ data, width, textAlign = "left" }: TableBodyProps) {
//   const alignmentClass = {
//     left: "text-left",
//     center: "text-center",
//     right: "text-right",
//   }[textAlign];

//   return (
//     <div
//       className={`px-5 py-2.5 sm:px-6 ${alignmentClass} max-w-[500px]`}
//       style={{ width }} // width ကို header နဲ့ sync
//     >
//       <p className="text-gray-500 text-[16px] dark:text-gray-300 truncate">{data}</p>
//     </div>
//   );
// }
