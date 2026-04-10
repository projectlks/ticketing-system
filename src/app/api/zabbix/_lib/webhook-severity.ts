import { Priority } from "@/generated/prisma/client";
import { normalizeOptionalText } from "./webhook-helpers";

export function mapSeverityToPriority(severity: string | undefined): Priority {
  switch (severity?.toLowerCase()) {
    case "disaster":
    case "high":
      return "CRITICAL";
    case "average":
      return "MAJOR";
    case "warning":
      return "MINOR";
    default:
      return "REQUEST";
  }
}

export function mapSeverityToOtrsPriorityLabel(severity: string | undefined): string {
  const normalized = normalizeOptionalText(severity)?.toLowerCase();
  switch (normalized) {
    case "disaster":
    case "critical":
      return "1 Critical";
    case "high":
      return "2 High";
    case "average":
    case "medium":
      return "3 Medium";
    case "warning":
    case "low":
      return "4 Low";
    case "information":
    case "info":
      return "5 Very Low";
    default:
      return "3 Medium";
  }
}

export function isAllowedOtrsSeverity(severity: string | undefined): boolean {
  const normalized = normalizeOptionalText(severity)?.toLowerCase();
  return normalized === "high" || normalized === "critical" || normalized === "disaster";
}
