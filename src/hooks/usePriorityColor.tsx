type PriorityType = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

type PriorityTone = {
  bg: string;
  borderAndText: string;
};

const priorityColors: Record<PriorityType | "DEFAULT", PriorityTone> = {
  REQUEST: {
    bg: "bg-sky-400",
    borderAndText: "border-sky-200 bg-sky-50 text-sky-700",
  },
  MINOR: {
    bg: "bg-amber-400",
    borderAndText: "border-amber-200 bg-amber-50 text-amber-700",
  },
  MAJOR: {
    bg: "bg-orange-400",
    borderAndText: "border-orange-200 bg-orange-50 text-orange-700",
  },
  CRITICAL: {
    bg: "bg-rose-400",
    borderAndText: "border-rose-200 bg-rose-50 text-rose-700",
  },
  DEFAULT: {
    bg: "bg-zinc-400",
    borderAndText: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
};

export function usePriorityColor(
  priority: string,
  type: "bg" | "borderAndText" = "bg",
): string {
  if (priority in priorityColors) {
    return priorityColors[priority as keyof typeof priorityColors][type];
  }

  return priorityColors.DEFAULT[type];
}
