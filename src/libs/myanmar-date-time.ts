export const MYANMAR_TIME_ZONE = "Asia/Yangon";

const PRIMARY_LOCALE = "my-MM";
const FALLBACK_LOCALE = "en-GB";

export const MYANMAR_DISPLAY_LOCALE =
  Intl.DateTimeFormat.supportedLocalesOf([PRIMARY_LOCALE]).length > 0
    ? PRIMARY_LOCALE
    : FALLBACK_LOCALE;

type DateInput = Date | string | number | null | undefined;

const toValidDate = (value: DateInput): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const MYANMAR_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(
  MYANMAR_DISPLAY_LOCALE,
  {
    timeZone: MYANMAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
);

const MYANMAR_TIME_FORMATTER = new Intl.DateTimeFormat(MYANMAR_DISPLAY_LOCALE, {
  timeZone: MYANMAR_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export const formatMyanmarDateTime = (value: DateInput): string => {
  const date = toValidDate(value);
  if (!date) return "";
  return MYANMAR_DATE_TIME_FORMATTER.format(date);
};

export const formatMyanmarTime = (value: DateInput): string => {
  const date = toValidDate(value);
  if (!date) return "";
  return MYANMAR_TIME_FORMATTER.format(date);
};
