// "use client";

// import Countdown from "@/components/Countdown";
// import { Status } from "@/generated/prisma/client";

// type Props = {
//   ticketId: string;
//   mode: "create" | "edit";
//   resolutionDue?: Date;
//   status: Status;
//   onStatusChange: (s: Status) => void;
// };

// export default function Header({
//   ticketId,
//   mode,
//   resolutionDue,
//   status,
//   onStatusChange,
// }: Props) {
//   const statuses: Status[] = [
//     "NEW",
//     "OPEN",
//     "IN_PROGRESS",
//     "RESOLVED",
//     "CLOSED",
//     "CANCELED",
//   ];

//   return (

//     <div className="border-b pb-5 mb-10 border-gray-300">

//       <div className="flex items-center justify-between mb-3 ">
//         <h1 className="font-bold text-2xl">{ticketId}</h1>



//         <div className="flex flex-wrap">
//           {statuses.map((s) => {
//             const isActive = status === s;
//             return (
//               <div
//                 key={s}
//                 onClick={() => mode === "edit" && onStatusChange(s)}
//                 className={`relative cursor-pointer px-8 py-1 text-sm font-medium border-y border-l border-gray-300
//                 ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
//               >
//                 {s.replace("_", " ")}
//                 <span
//                   className={`absolute top-1/2 -translate-y-1/2 left-full w-0 h-0
//                 border-t-14 border-b-14 border-l-20 border-t-transparent border-b-transparent
//                 ${isActive ? "border-l-blue-600" : "border-l-gray-200"}  z-9999   `}

//                 />
//               </div>

//             );
//           })}
//         </div>
//       </div>


//       {mode === "edit" && resolutionDue && (
//         <div className="flex items-center gap-2">
//           <span className="font-medium">Time Remaining :</span>
//           <Countdown targetTime={resolutionDue.toString()} />
//         </div>
//       )}
//     </div>

//   );
// }


"use client";

import Countdown from "@/components/Countdown";
import { Status } from "@/generated/prisma/client";

type Props = {
  ticketId: string;
  mode: "create" | "edit";
  resolutionDue?: Date;
  status: Status;
  onStatusChange: (s: Status) => void;
};

const statuses: Status[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELED",
];

export default function Header({
  ticketId,
  mode,
  resolutionDue,
  status,
  onStatusChange,
}: Props) {
  return (
    <div className="mb-8 border-b pb-6 border-gray-300">
      {/* Top row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Ticket ID */}
        <div>
          <p className="text-sm text-gray-500">Ticket ID</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ticketId}
          </h1>
        </div>

        {/* Countdown */}
        {mode === "edit" && resolutionDue && (
          <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium text-gray-600">
              Time remaining
            </span>
            <Countdown targetTime={resolutionDue.toISOString()} />
          </div>
        )}
      </div>

      {/* Status selector */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-gray-600">
          Status
        </p>

        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const isActive = s === status;

            return (
              <button
                key={s}
                type="button"
                disabled={mode !== "edit"}
                onClick={() => onStatusChange(s)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition
                  ${isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                  ${mode !== "edit" ? "cursor-not-allowed opacity-60" : ""}
                `}
              >
                {s.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
