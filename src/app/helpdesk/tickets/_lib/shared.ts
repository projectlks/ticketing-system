import { getCurrentUserId } from "@/libs/action";
import dayjs from "@/libs/dayjs";
import {
  CreationMode,
  Priority,
  Prisma,
  Role,
  Status,
  Ticket,
} from "@/generated/prisma/client";
import { prisma } from "@/libs/prisma";
import { z } from "zod";

const PriorityEnum = z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]);
const StatusEnum = z.enum([
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELED",
]);

export const TicketFormSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  departmentId: z.string().optional(),
  categoryId: z.string().optional(),
  priority: PriorityEnum,
  remark: z.string().optional(),
  assignedToId: z.string().optional(),
  status: StatusEnum,
});

export const createFormSchema = TicketFormSchema;

export const VALID_STATUS_SET = new Set<Status>(
  Object.values(Status) as Status[],
);
export const VALID_PRIORITY_SET = new Set<Priority>(
  Object.values(Priority) as Priority[],
);
export const VALID_CREATION_MODE_SET = new Set<CreationMode>(
  Object.values(CreationMode) as CreationMode[],
);

export const ACTIVE_WORK_STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "NEW"];
export const CLOSED_LIKE_STATUSES: Status[] = [
  "CLOSED",
  "RESOLVED",
  "CANCELED",
];
export const SUPER_ADMIN_ROLE: Role = "SUPER_ADMIN";

const MAX_TICKET_ATTACHMENTS = 6;
const MAX_TICKET_IMAGE_ATTACHMENTS = 3;
const MAX_TICKET_FILE_ATTACHMENTS = 3;
const TICKET_UPLOAD_PREFIX = "/api/uploads/";
const ATTACHMENT_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

const MYANMAR_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;

export type SingleTicket = {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  departmentId: string | null;
  categoryId: string | null;
  priority: Priority | null;
  images: {
    id: string;
    url: string;
  }[];
  status: Status;
  assignedToId: string | null;
};

export type UpdatedTicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
    category: { select: { id: true; name: true } };
    assignedTo: { select: { id: true; name: true, email: true} };
  };
}>;

export type TicketWithRelations = Ticket & {
  requester?: { name: string; email: string } | null;
  assignedTo?: { name: string; email: string } | null;
  department: { id: string; name: string } | null;
};

export interface GetTicketsOptions {
  search?: Record<string, string[]>;
  filters?: Record<string, string[]>;
  page?: number;
  pageSize?: number;
}

export type TicketActionResult<T> = {
  data?: T;
  error?: string;
};

export type TicketMutationOptions = {
  actorUserId?: string | null;
  allowApiTokenActorlessUpdate?: boolean;
};

type ActorContext = {
  id: string;
  role: Role;
};

const getAttachmentKindFromUrl = (
  url: string,
): "image" | "file" | "unknown" => {
  const trimmed = url.trim();
  if (!trimmed.startsWith(TICKET_UPLOAD_PREFIX)) return "unknown";

  const lowerPath = trimmed.split("?")[0]?.toLowerCase() ?? "";
  const fileName = lowerPath.split("/").pop() ?? "";

  if (fileName.startsWith("img-")) return "image";
  if (fileName.startsWith("file-")) return "file";

  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return "unknown";

  const extension = fileName.slice(dotIndex);
  if (ATTACHMENT_IMAGE_EXTENSIONS.has(extension)) return "image";
  return "file";
};

export const validateTicketAttachmentUrls = (
  urls: string[],
): string | null => {
  if (urls.length > MAX_TICKET_ATTACHMENTS) {
    return `You can attach up to ${MAX_TICKET_ATTACHMENTS} files per ticket.`;
  }

  let imageCount = 0;
  let fileCount = 0;

  for (const url of urls) {
    const kind = getAttachmentKindFromUrl(url);
    if (kind === "unknown") {
      return "Invalid attachment URL.";
    }

    if (kind === "image") {
      imageCount += 1;
      if (imageCount > MAX_TICKET_IMAGE_ATTACHMENTS) {
        return `You can attach up to ${MAX_TICKET_IMAGE_ATTACHMENTS} images per ticket.`;
      }
      continue;
    }

    fileCount += 1;
    if (fileCount > MAX_TICKET_FILE_ATTACHMENTS) {
      return `You can attach up to ${MAX_TICKET_FILE_ATTACHMENTS} files per ticket.`;
    }
  }

  return null;
};

export const normalizeOptionalRelationId = (
  value: string | FormDataEntryValue | null | undefined,
): string | null => {
  const normalized = (
    typeof value === "string" ? value : value?.toString() ?? ""
  ).trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower === "null" || lower === "undefined") return null;
  return normalized;
};

export const ensureAssignableUserExists = async (
  assignedToId: string | null,
): Promise<string | null> => {
  if (!assignedToId) return null;

  const assignee = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      isArchived: false,
    },
    select: { id: true },
  });

  if (!assignee) {
    return "Selected assignee does not exist";
  }

  return null;
};

export const getMyanmarDayRange = (baseDate = new Date()) => {
  const shifted = dayjs(baseDate.getTime() + MYANMAR_OFFSET_MS);
  const startShifted = shifted.startOf("day");
  const endShifted = shifted.endOf("day");

  return {
    start: new Date(startShifted.valueOf() - MYANMAR_OFFSET_MS),
    end: new Date(endShifted.valueOf() - MYANMAR_OFFSET_MS),
  };
};

export const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};

export const resolveActorContext = async (
  actorUserId?: string | null,
): Promise<ActorContext | undefined> => {
  const normalized = actorUserId?.trim();
  if (normalized) {
    const actor = await prisma.user.findFirst({
      where: {
        id: normalized,
        isArchived: false,
      },
      select: { id: true, role: true },
    });
    return actor ?? undefined;
  }

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return undefined;

  const actor = await prisma.user.findFirst({
    where: {
      id: currentUserId,
      isArchived: false,
    },
    select: { id: true, role: true },
  });

  return actor ?? undefined;
};
