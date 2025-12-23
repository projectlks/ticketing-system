"use client";

import  PriorityStars  from "@/components/PriorityStars";

type Props = {
  value: "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";
  mode: "create" | "edit";
  onChange: (v: Props["value"]) => void;
};

export default function PrioritySection({ value,  onChange }: Props) {
  return (
    <div className="mb-6">
      <PriorityStars value={value} onChange={onChange} />
    </div>
  );
}
