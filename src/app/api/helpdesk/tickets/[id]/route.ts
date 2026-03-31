import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/libs/action";
import { updateTicketStatus } from "@/app/helpdesk/tickets/action";

interface Params {
  id: string;
}

const UpdateTicketStatusPayloadSchema = z.object({
  status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]),
}).strict();

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

  let jsonPayload: unknown;
  try {
    jsonPayload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = UpdateTicketStatusPayloadSchema.safeParse(jsonPayload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const result = await updateTicketStatus(id, parsed.data.status, {
    actorUserId: sessionUserId ?? null,
    allowApiTokenActorlessUpdate: tokenAuthorized && !sessionUserId,
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
  });
}
