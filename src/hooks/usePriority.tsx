   type PriorityType = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";

    const priorityColors: Record<PriorityType | "DEFAULT", { bg: string; borderAndText: string }> = {
        REQUEST: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
        MINOR: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        MAJOR: { bg: "bg-orange-500", borderAndText: "border-orange-500 text-orange-500" },
        CRITICAL: { bg: "bg-red-500", borderAndText: "border-red-500 text-red-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
    };

    export function usePriorityColor(priority: string, type: "bg" | "borderAndText" = "bg"): string {
        if (priority in priorityColors) {
            return priorityColors[priority as keyof typeof priorityColors][type];
        }
        return priorityColors.DEFAULT[type];
    }