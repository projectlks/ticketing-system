"use client";

import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

export type PriorityValue = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

const priorityLevels: {
  value: PriorityValue;
  label: string;
  stars: number;
  helper: string;
}[] = [
  { value: "REQUEST", label: "Request", stars: 1, helper: "Informational" },
  { value: "MINOR", label: "Minor", stars: 2, helper: "Low impact" },
  { value: "MAJOR", label: "Major", stars: 3, helper: "Service affected" },
  { value: "CRITICAL", label: "Critical", stars: 4, helper: "Immediate action" },
];

type Props = {
  value: PriorityValue;
  onChange: (p: PriorityValue) => void;
};

export default function PriorityStars({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {priorityLevels.map((level) => {
        const isActive = level.value === value;

        return (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              isActive
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{level.label}</span>
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4].map((star) =>
                  star <= level.stars ? (
                    <StarSolid
                      key={`${level.value}-solid-${star}`}
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-white" : "text-zinc-700"
                      }`}
                    />
                  ) : (
                    <StarOutline
                      key={`${level.value}-outline-${star}`}
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-zinc-400" : "text-zinc-300"
                      }`}
                    />
                  ),
                )}
              </span>
            </div>
            <p
              className={`mt-1 text-[11px] ${
                isActive ? "text-zinc-300" : "text-zinc-500"
              }`}>
              {level.helper}
            </p>
          </button>
        );
      })}
    </div>
  );
}
