"use client";

import PriorityStars from "@/components/PriorityStars";

type Props = {
  value: "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";
  mode: "create" | "edit";
  onChange: (v: Props["value"]) => void;
};

export default function PrioritySection({ value, onChange }: Props) {
  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-zinc-700">Priority</p>
      <PriorityStars value={value} onChange={onChange} />
    </section>
  );
}
