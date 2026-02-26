export type QuickRange =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "month"
  | "custom";

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

// Client-side quick range တွင်သုံးဖို့ analysis timezone ကို သီးခြား constant အဖြစ်ထားပါတယ်။
// (date-filter.ts ကို import မလုပ်ရသလို client bundle ထဲ Prisma dependency မဝင်စေဖို့)
const ANALYSIS_TIME_ZONE = "Asia/Yangon";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const ANALYSIS_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYSIS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type DateParts = {
  year: string;
  month: string;
  day: string;
};

// Intl.formatToParts မှာရလာတဲ့ year/month/day ကို type-safe object အဖြစ်ပြန်တည်ဆောက်ပေးပါတယ်။
const getAnalysisDateParts = (date: Date): DateParts => {
  const parts = ANALYSIS_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return { year, month, day };
};

// input[type=date] တွင်လိုအပ်တဲ့ YYYY-MM-DD ကို analysis timezone အတိုင်းပြန်ထုတ်ပေးပါတယ်။
const toInputDateInAnalysisTimeZone = (date: Date): string => {
  const parts = getAnalysisDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const shiftByDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * DAY_IN_MS);

// ဒီလအစ (YYYY-MM-01) ကို analysis timezone calendar အတိုင်းထုတ်ပေးပါတယ်။
const getMonthStartInput = (date: Date): string => {
  const parts = getAnalysisDateParts(date);
  return `${parts.year}-${parts.month}-01`;
};

// Quick range key ကို server action/filter API တွင်သုံးမယ့် fromDate/toDate pair အဖြစ်ပြောင်းပေးပါတယ်။
export const getQuickRangeValues = (
  range: Exclude<QuickRange, "custom">,
): { fromDate: string; toDate: string } => {
  const now = new Date();

  if (range === "all") {
    return { fromDate: "", toDate: "" };
  }

  const toDate = toInputDateInAnalysisTimeZone(now);

  if (range === "today") {
    return { fromDate: toDate, toDate };
  }

  if (range === "month") {
    return { fromDate: getMonthStartInput(now), toDate };
  }

  const backDays = range === "last7" ? 6 : 29;
  const from = shiftByDays(now, -backDays);

  return {
    fromDate: toInputDateInAnalysisTimeZone(from),
    toDate,
  };
};
