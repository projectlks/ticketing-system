type CreationModeType = "MANUAL" | "AUTOMATIC";

type CreationModeTone = {
  bg: string;
  borderAndText: string;
};

const creationModeColors: Record<CreationModeType | "DEFAULT", CreationModeTone> = {
  MANUAL: {
    bg: "bg-slate-400",
    borderAndText: "border-slate-200 bg-slate-50 text-slate-700",
  },
  AUTOMATIC: {
    bg: "bg-indigo-400",
    borderAndText: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  DEFAULT: {
    bg: "bg-zinc-400",
    borderAndText: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
};

export function useCreationModeColor(
  mode: string,
  type: "bg" | "borderAndText" = "bg",
) {
  const key = mode as CreationModeType;
  return creationModeColors[key]?.[type] ?? creationModeColors.DEFAULT[type];
}
