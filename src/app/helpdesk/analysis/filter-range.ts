export type QuickRange = "all" | "today" | "last7" | "last30" | "month" | "custom";

export const quickRangeOptions: Array<{
  key: Exclude<QuickRange, "custom">;
  label: string;
}> = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
];

// Date input[type=date] format (YYYY-MM-DD) ကို local timezone ဖြင့်ပြန်ထုတ်ပေးပါတယ်။
const toInputDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Quick range key ကို fromDate/toDate value pair အဖြစ်ပြောင်းပေးတဲ့ helper ဖြစ်ပါတယ်။
export const getQuickRangeValues = (
  range: Exclude<QuickRange, "custom">,
): { fromDate: string; toDate: string } => {
  const now = new Date();

  if (range === "all") {
    return { fromDate: "", toDate: "" };
  }

  const toDate = toInputDate(now);

  if (range === "today") {
    return { fromDate: toDate, toDate };
  }

  if (range === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: toInputDate(monthStart), toDate };
  }

  const from = new Date(now);
  const backDays = range === "last7" ? 6 : 29;
  from.setDate(now.getDate() - backDays);

  return { fromDate: toInputDate(from), toDate };
};
