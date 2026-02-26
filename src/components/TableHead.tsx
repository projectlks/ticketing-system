import React from "react";

interface TableHeadProps {
  data: string;
}

export default function TableHead({ data }: TableHeadProps) {
  return (
    <th className="px-4 py-3 text-left">
      {/* Header label ကို nowrap ထားပေးထားလို့ narrow column မှာတောင်
          စာကြောင်းကျိုးမသွားဘဲ horizontal scroll UX နဲ့တည်ငြိမ်နေစေပါတယ်။ */}
      <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {data}
      </div>
    </th>
  );
}
