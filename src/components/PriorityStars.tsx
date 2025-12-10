// // "use client";

// // import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
// // import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

// // export type PriorityValue = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

// // const priorityLevels: { value: PriorityValue; stars: number }[] = [
// //     { value: "REQUEST", stars: 1 },
// //     { value: "MINOR", stars: 2 },
// //     { value: "MAJOR", stars: 3 },
// //     { value: "CRITICAL", stars: 4 },
// // ];

// // export function PriorityStars({
// //     value,
// //     onChange,
// //     error,
// //     mode,
// // }: {
// //     value: PriorityValue;
// //     onChange: (priority: PriorityValue) => void;
// //     error?: string;
// //     mode: "create" | "edit";
// // }) {
// //     const currentStars =
// //         priorityLevels.find((p) => p.value === value)?.stars ?? 1;


// //     const [remark, setRemark] = useState("");
// //     const [lastPriority, setLastPriority] = useState(value);

// //     return (

// //         <div>

// //             <div className=" flex items-center  space-x-1">
// //                 <label className="block font-medium ">Priority :</label>
// //                 {/* <p>:</p> */}

// //                 <div className="flex items-center  gap-2">
// //                     {[1, 2, 3, 4].map((star) => {
// //                         const selected = star <= currentStars;

// //                         return selected ? (
// //                             <StarSolid
// //                                 key={star}
// //                                 className="w-6 h-6 text-yellow-500 cursor-pointer"
// //                                 onClick={() =>
// //                                     onChange(priorityLevels[star - 1].value)
// //                                 }
// //                             />
// //                         ) : (
// //                             <StarOutline
// //                                 key={star}
// //                                 className="w-6 h-6 text-gray-400 cursor-pointer"
// //                                 onClick={() =>
// //                                     onChange(priorityLevels[star - 1].value)
// //                                 }
// //                             />
// //                         );
// //                     })}
// //                 </div>

// //                 {error && (
// //                     <p className="text-red-500 text-sm mt-1">{error}</p>
// //                 )}
// //             </div>

// //             {/* Remark (only for edit mode) */}
// //             {mode === "edit" && (
// //                 <div>
// //                     <label className="font-medium">Remark</label>
// //                     <input
// //                         value={remark}
// //                         onChange={(e) => setRemark(e.target.value)}
// //                         placeholder="Enter remark (required if priority changes)"
// //                         className="w-full px-2 py-2 border rounded-md"
// //                     />
// //                 </div>
// //             )}
// //         </div>

// //     );
// // }



// "use client";

// import { useState } from "react";
// import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
// import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

// export type PriorityValue = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

// const priorityLevels = [
//     { value: "REQUEST", stars: 1 },
//     { value: "MINOR", stars: 2 },
//     { value: "MAJOR", stars: 3 },
//     { value: "CRITICAL", stars: 4 },
// ];

// export function PriorityStars({ value, onChange, mode }: {
//     value: PriorityValue;
//     onChange: (priority: PriorityValue, remark?: string) => void;
//     mode: "create" | "edit";
// }) {

//     const [remark, setRemark] = useState("");
//     const [lastPriority, setLastPriority] = useState(value);
//     const currentStars = priorityLevels.find(p => p.value === value)?.stars ?? 1;

//     // priority change logic
//     const handlePriorityClick = (newPriority: PriorityValue) => {
//         if (mode === "edit" && newPriority !== lastPriority) {
//             // require remark
//             if (!remark.trim()) {
//                 alert("Please add a remark for priority change.");
//                 return;
//             }
//         }

//         setLastPriority(newPriority);
//         onChange(newPriority, remark);
//         setRemark(""); // clear after saved
//     };

//     return (
//         <div>
//             {/* Priority Stars */}
//             <div className="flex items-center space-x-2 mb-3">
//                 <label className="font-medium">Priority:</label>
//                 <div className="flex gap-1">
//                     {[1, 2, 3, 4].map((star, i) => {
//                         const selected = star <= currentStars;
//                         const priority = priorityLevels[i].value as PriorityValue; // FIX

//                         return selected ? (
//                             <StarSolid
//                                 key={star}
//                                 className="w-6 h-6 text-yellow-500 cursor-pointer"
//                                 onClick={() => handlePriorityClick(priority)}
//                             />
//                         ) : (
//                             <StarOutline
//                                 key={star}
//                                 className="w-6 h-6 text-gray-400 cursor-pointer"
//                                 onClick={() => handlePriorityClick(priority)}
//                             />
//                         );
//                     })}

//                 </div>
//             </div>

//             {/* Remark (only for edit mode) */}
//             {mode === "edit" && (
//                 <div>
//                     <label className="font-medium">Remark</label>
//                     <input
//                         value={remark}
//                         onChange={(e) => setRemark(e.target.value)}
//                         placeholder="Enter remark (required if priority changes)"
//                         className="w-full px-2 py-2 border rounded-md"
//                     />
//                 </div>
//             )}
//         </div>
//     );
// }
"use client";

import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

export type PriorityValue = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

const priorityLevels: { value: PriorityValue; stars: number }[] = [
    { value: "REQUEST", stars: 1 },
    { value: "MINOR", stars: 2 },
    { value: "MAJOR", stars: 3 },
    { value: "CRITICAL", stars: 4 },
];

export function PriorityStars({
    value,
    onChange,
    mode,
}: {
    value: PriorityValue;
    onChange: (priority: PriorityValue) => void;
    mode: "create" | "edit";
}) {
    const currentStars =
        priorityLevels.find((p) => p.value === value)?.stars ?? 1;

    return (
        <div className="flex items-center gap-3">
            <label className="font-medium">Priority :</label>

            <div className="flex gap-1">
                {[1, 2, 3, 4].map((star) => {
                    const selected = star <= currentStars;

                    return selected ? (
                        <StarSolid
                            key={star}
                            className="w-6 h-6 text-yellow-500 cursor-pointer"
                            onClick={() =>
                                onChange(priorityLevels[star - 1].value)
                            }
                        />
                    ) : (
                        <StarOutline
                            key={star}
                            className="w-6 h-6 text-gray-400 cursor-pointer"
                            onClick={() =>
                                onChange(priorityLevels[star - 1].value)
                            }
                        />
                    );
                })}
            </div>
        </div>
    );
}
