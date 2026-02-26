export type StatusType =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELED";

type StatusTone = {
  bg: string;
  borderAndText: string;
};

// Bright color များမထွက်အောင် muted tone သုံးပြီး SaaS dashboard style နဲ့တူစေထားပါတယ်။
const statusColors: Record<StatusType | "DEFAULT", StatusTone> = {
  NEW: { bg: "bg-slate-400", borderAndText: "border-slate-200 bg-slate-50 text-slate-700" },
  OPEN: {
    bg: "bg-emerald-400",
    borderAndText: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  IN_PROGRESS: {
    bg: "bg-amber-400",
    borderAndText: "border-amber-200 bg-amber-50 text-amber-700",
  },
  RESOLVED: { bg: "bg-sky-400", borderAndText: "border-sky-200 bg-sky-50 text-sky-700" },
  CLOSED: { bg: "bg-zinc-400", borderAndText: "border-zinc-200 bg-zinc-100 text-zinc-700" },
  CANCELED: {
    bg: "bg-zinc-400",
    borderAndText: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
  DEFAULT: {
    bg: "bg-zinc-400",
    borderAndText: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
};

export function useStatusColor(
  status: string,
  type: "bg" | "borderAndText" = "bg",
) {
  const key = status as StatusType;
  return statusColors[key]?.[type] ?? statusColors.DEFAULT[type];
}
