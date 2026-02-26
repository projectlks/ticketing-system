type DepartmentLoadBarProps = {
  newCount: number;
  openCount: number;
  urgentCount: number;
};

type Segment = {
  key: "new" | "open" | "urgent";
  label: string;
  value: number;
  colorClass: string;
};

export default function DepartmentLoadBar({
  newCount,
  openCount,
  urgentCount,
}: DepartmentLoadBarProps) {
  const segments: Segment[] = [
    { key: "new", label: "NEW", value: newCount, colorClass: "bg-zinc-400" },
    { key: "open", label: "OPEN", value: openCount, colorClass: "bg-zinc-700" },
    { key: "urgent", label: "URGENT", value: urgentCount, colorClass: "bg-black" },
  ];

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Workload Mix</span>
        <span>{total} active signals</span>
      </div>

      {/* Segment width တွေကို normalized percentage နဲ့တွက်ထားလို့
          count distribution တကယ်ပြောင်းသလို progress bar ratio ကလည်းတိတိကျကျလိုက်ပြောင်းပါတယ်။ */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div className="flex h-full w-full">
          {segments.map((segment) => {
            const widthPercent =
              total > 0 ? Math.round((segment.value / total) * 100) : 0;

            return (
              <span
                key={segment.key}
                style={{ width: `${widthPercent}%` }}
                className={segment.colorClass}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
        {segments.map((segment) => (
          <p
            key={`legend-${segment.key}`}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-600">
            {segment.label} {segment.value}
          </p>
        ))}
      </div>
    </section>
  );
}
