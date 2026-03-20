import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/libs/action";
import { updateTicket } from "@/app/helpdesk/tickets/action";

interface Params {
  id: string;
}

const UpdateTicketPayloadSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  departmentId: z.string().min(1),
  categoryId: z.string().min(1),
  priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]),
  status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]),
  assignedToId: z.string().nullable().optional(),
  remark: z.string().optional(),
  existingImageIds: z.array(z.string()).optional(),
  newImages: z.array(z.string()).optional(),
  deletedImageIds: z.array(z.string()).optional(),
});

const extractTokenFromRequest = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("x-ticket-api-key")?.trim();
  if (headerToken) return headerToken;

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return null;
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;

  const token = authorization.slice(7).trim();
  return token || null;
};

const hasValidApiToken = (request: NextRequest): boolean => {
  const expected = process.env.TICKET_UPDATE_API_TOKEN?.trim();
  if (!expected) return false;

  const actual = extractTokenFromRequest(request);
  return Boolean(actual && actual === expected);
};

const toFormData = (
  payload: z.infer<typeof UpdateTicketPayloadSchema>,
): FormData => {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("departmentId", payload.departmentId);
  formData.append("categoryId", payload.categoryId);
  formData.append("priority", payload.priority);
  formData.append("status", payload.status);
  formData.append("remark", payload.remark ?? "");
  formData.append("assignedToId", payload.assignedToId ?? "");

  if (payload.existingImageIds) {
    formData.append("existingImageIds", JSON.stringify(payload.existingImageIds));
  }
  if (payload.newImages) {
    formData.append("newImages", JSON.stringify(payload.newImages));
  }
  if (payload.deletedImageIds) {
    formData.append("deletedImageIds", JSON.stringify(payload.deletedImageIds));
  }

  return formData;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Ticket id is required" },
      { status: 400 },
    );
  }

  const sessionUserId = await getCurrentUserId();
  const tokenAuthorized = hasValidApiToken(request);

  if (!sessionUserId && !tokenAuthorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tokenActorUserId = process.env.TICKET_UPDATE_API_ACTOR_ID?.trim();
  const actorUserId = sessionUserId ?? tokenActorUserId;

  if (!actorUserId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "TICKET_UPDATE_API_ACTOR_ID is required when calling this route with API token auth.",
      },
      { status: 500 },
    );
  }

  let jsonPayload: unknown;
  try {
    jsonPayload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = UpdateTicketPayloadSchema.safeParse(jsonPayload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const result = await updateTicket(id, toFormData(parsed.data), {
    actorUserId,
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to update ticket" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data.updated,
    urlsToDelete: result.data.urlsToDelete,
  });
}
