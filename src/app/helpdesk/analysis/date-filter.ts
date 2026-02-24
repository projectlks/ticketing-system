import { Prisma } from "@/generated/prisma/client";

export type AnalysisDateFilter = {
  fromDate?: string | null;
  toDate?: string | null;
};

export const ANALYSIS_TIME_ZONE = "Asia/Yangon";

// Analysis/reporting date range ကို Myanmar timezone (+06:30) အတိုင်း တိတိကျကျ filter လုပ်ဖို့ offset ကို fixed သတ်မှတ်ထားပါတယ်။
const MYANMAR_UTC_OFFSET_MINUTES = 6 * 60 + 30;
const MYANMAR_UTC_OFFSET_MS = MYANMAR_UTC_OFFSET_MINUTES * 60 * 1000;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ParsedInputDate = {
  year: number;
  month: number;
  day: number;
};

// Date input ထဲက whitespace-only value တွေကို undefined ပြောင်းပြီး query filter မထည့်အောင် normalize လုပ်ထားပါတယ်။
const normalizeDateInput = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

// YYYY-MM-DD format ကို strict parse လုပ်ပြီး calendar-valid ဖြစ်မှ object ပြန်ပေးပါတယ်။
const parseDateInput = (value: string): ParsedInputDate | null => {
  if (!DATE_INPUT_PATTERN.test(value)) return null;

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // 2026-02-30 လို invalid date မဝင်အောင် UTC calendar equality စစ်ပါတယ်။
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

// Myanmar local day start (00:00:00) ကို UTC Date အဖြစ်ပြောင်းပြီး Prisma filter ထဲထည့်ဖို့ helper ဖြစ်ပါတယ်။
const toUtcStartOfMyanmarDate = (date: ParsedInputDate): Date =>
  new Date(
    Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0) -
      MYANMAR_UTC_OFFSET_MS,
  );

// Myanmar local day end (23:59:59.999) ကို UTC Date အဖြစ်ပြောင်းပြီး Prisma filter ထဲထည့်ဖို့ helper ဖြစ်ပါတယ်။
const toUtcEndOfMyanmarDate = (date: ParsedInputDate): Date =>
  new Date(
    Date.UTC(date.year, date.month - 1, date.day, 23, 59, 59, 999) -
      MYANMAR_UTC_OFFSET_MS,
  );

const toComparableDayValue = (date: ParsedInputDate): number =>
  Date.UTC(date.year, date.month - 1, date.day);

const ANALYSIS_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: ANALYSIS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

// CSV/report display အတွက် Date value ကို Analysis timezone အတိုင်း format ပြန်ပေးပါတယ်။
export const formatDateTimeInAnalysisTimeZone = (
  value: Date | null | undefined,
): string => {
  if (!value) return "";
  return ANALYSIS_DATE_TIME_FORMATTER.format(value);
};

export function buildTicketDateWhere(
  filter: AnalysisDateFilter,
): Prisma.TicketWhereInput {
  // Archived ticket မပါစေဖို့ base condition ကို default ထည့်ထားပါတယ်။
  const where: Prisma.TicketWhereInput = { isArchived: false };

  const fromRaw = normalizeDateInput(filter.fromDate);
  const toRaw = normalizeDateInput(filter.toDate);

  const fromDate = fromRaw ? parseDateInput(fromRaw) : null;
  const toDate = toRaw ? parseDateInput(toRaw) : null;

  // Invalid date format ကို server side မှာတစ်ခါထပ်စစ်ပြီး route/action နှစ်နေရာလုံးမှာ shared validation ရနိုင်အောင်ထားပါတယ်။
  if (fromRaw && !fromDate) {
    throw new Error("Invalid fromDate. Use YYYY-MM-DD format.");
  }

  if (toRaw && !toDate) {
    throw new Error("Invalid toDate. Use YYYY-MM-DD format.");
  }

  if (
    fromDate &&
    toDate &&
    toComparableDayValue(fromDate) > toComparableDayValue(toDate)
  ) {
    throw new Error("fromDate must be less than or equal to toDate.");
  }

  if (fromDate || toDate) {
    // fromDate/toDate တစ်ဖက်ဖက်ပေးထားရင် createdAt range filter ဆောက်ပါတယ်။
    where.createdAt = {};

    if (fromDate) {
      where.createdAt.gte = toUtcStartOfMyanmarDate(fromDate);
    }

    if (toDate) {
      where.createdAt.lte = toUtcEndOfMyanmarDate(toDate);
    }
  }

  return where;
}
