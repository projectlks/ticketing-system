type PriorityType = "INFORMATION" | "WARNING" | "AVERAGE" | "HIGH" | "DISASTER";



const priorityColors: Record<PriorityType | "DEFAULT", { bg: string; borderAndText: string }> = {
    INFORMATION: { bg: "bg-[#7499FF]", borderAndText: "border-[#7499FF] text-[#7499FF]" },
    WARNING: { bg: "bg-[#FFC859]", borderAndText: "border-[#FFC859] text-[#FFC859]" },
    AVERAGE: { bg: "bg-[#FFA059]", borderAndText: "border-[#FFA059] text-[#FFA059]" },
    HIGH: { bg: "bg-[#E97659]", borderAndText: "border-[#E97659] text-[#E97659]" },
    DISASTER: { bg: "bg-[#E45959]", borderAndText: "border-[#E45959] text-[#E45959]" },
    DEFAULT: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
};

export function useDaillyActivityPriorityColor(priority: string, type: "bg" | "borderAndText" = "bg"): string {
    if (priority in priorityColors) {
        return priorityColors[priority as keyof typeof priorityColors][type];
    }
    return priorityColors.DEFAULT[type];
}