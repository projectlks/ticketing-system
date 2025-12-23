

// "use client";

// import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
// import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

// export type PriorityValue = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

// const priorityLevels: { value: PriorityValue; stars: number }[] = [
//     { value: "REQUEST", stars: 1 },
//     { value: "MINOR", stars: 2 },
//     { value: "MAJOR", stars: 3 },
//     { value: "CRITICAL", stars: 4 },
// ];

// const priorityLabels: Record<PriorityValue, string> = {
//     REQUEST: "Request",
//     MINOR: "Minor",
//     MAJOR: "Major",
//     CRITICAL: "Critical",
// };

// export function PriorityStars({
//     value,
//     onChange,
//     mode,
// }: {
//     value: PriorityValue;
//     onChange: (priority: PriorityValue) => void;
//     mode: "create" | "edit";
// }) {
//     const currentStars =
//         priorityLevels.find((p) => p.value === value)?.stars ?? 1;

//     return (
//         <div className="flex items-center gap-3">
//             <label className="font-medium">Priority :</label>

//             <div className="flex gap-1">
//                 {[1, 2, 3, 4].map((star) => {
//                     const selected = star <= currentStars;
//                     const priority = priorityLevels[star - 1].value;

//                     const Icon = selected ? StarSolid : StarOutline;

//                     return (
//                         <div key={star} className="relative group">
//                             <Icon
//                                 className={`w-6 h-6 cursor-pointer ${selected ? "text-yellow-500" : "text-gray-400"
//                                     }`}
//                                 onClick={() => onChange(priority)}
//                             />

//                             {/* Tooltip */}
//                             <span
//                                 className="
//     pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2
//     rounded-md bg-gray-700/90 px-2 py-1 text-xs text-gray-100
//     shadow-sm
//     opacity-0 transition-opacity duration-200
//     group-hover:opacity-100
//   "
//                             >
//                                 {priorityLabels[priority]}
//                             </span>

//                         </div>
//                     );
//                 })}
//             </div>
//         </div>
//     );
// }

"use client";

import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

export type PriorityValue =
  | "REQUEST"
  | "MINOR"
  | "MAJOR"
  | "CRITICAL";

const priorityLevels: {
  value: PriorityValue;
  label: string;
  stars: number;
}[] = [
  { value: "REQUEST", label: "Request", stars: 1 },
  { value: "MINOR", label: "Minor", stars: 2 },
  { value: "MAJOR", label: "Major", stars: 3 },
  { value: "CRITICAL", label: "Critical", stars: 4 },
];

type Props = {
  value: PriorityValue;
  onChange: (p: PriorityValue) => void;
};

export default function PriorityStars({ value, onChange }: Props) {
  const currentStars =
    priorityLevels.find((p) => p.value === value)?.stars ?? 1;

  return (
    <div className="flex items-center gap-4">
      <span className="font-medium">Priority</span>

      <div className="flex gap-1">
        {[1, 2, 3, 4].map((star) => {
          const level = priorityLevels[star - 1];
          const active = star <= currentStars;

          return (
            <div key={star} className="relative group">
              {active ? (
                <StarSolid
                  className="w-6 h-6 text-yellow-500 cursor-pointer"
                  onClick={() => onChange(level.value)}
                />
              ) : (
                <StarOutline
                  className="w-6 h-6 text-gray-400 cursor-pointer"
                  onClick={() => onChange(level.value)}
                />
              )}

              {/* tooltip */}
              <span
                className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2
                rounded bg-gray-800/80 px-2 py-0.5 text-xs text-gray-100
                opacity-0 transition group-hover:opacity-100 whitespace-nowrap"
              >
                {level.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
