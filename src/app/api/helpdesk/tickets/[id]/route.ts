import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/libs/prisma";
import { updateTicket } from "@/app/helpdesk/tickets/action";
import { withAuth } from "@/libs/api-auth-wrapper"; // 🌟 withAuth ကို Import လုပ်ပါမည်

interface Params {
  id: string;
}

// const UpdateTicketPayloadSchema = z.object({
//   status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]).optional(),
//   description: z.string().optional(),
//   priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]).optional(),
//   remark: z.string().optional(),
// }).refine((data) => {
//   if (data.priority && (!data.remark || data.remark.trim() === "")) return false;
//   return true;
// }, {
//   message: "Remark is required when changing priority.",
//   path: ["remark"],
// });

const UpdateTicketPayloadSchema = z.object({
  status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]).optional(),
  description: z.string().optional(),
  priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]).optional(),
  remark: z.string().optional(),
})
  .strict() // 🌟 ဤနေရာတွင် .strict() ကို ထည့်ပါမည်
  .refine((data) => {
    if (data.priority && (!data.remark || data.remark.trim() === "")) return false;
    return true;
  }, {
    message: "Remark is required when changing priority.",
    path: ["remark"],
  });

type UpdateTicketPayload = z.infer<typeof UpdateTicketPayloadSchema>;


// 🌟 PATCH function ကို withAuth ဖြင့် ပတ်လိုက်ပါပြီ (context ကို တတိယ Parameter အဖြစ် ယူပါမည်)
export const PATCH = withAuth(async (
  request: NextRequest,
  userId: string,
  context: { params: Promise<Params> }
) => {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ success: false, error: "Ticket id is required" }, { status: 400 });
  }

  // လုံခြုံရေးစစ်ဆေးခြင်းများကို withAuth က လုပ်ပေးသွားပြီဖြစ်၍ ဖြုတ်လိုက်ပါသည်

  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const resultParse = UpdateTicketPayloadSchema.safeParse(jsonBody);
  if (!resultParse.success) {
    return NextResponse.json(
      { success: false, error: resultParse.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const validatedData: UpdateTicketPayload = resultParse.data;

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!existingTicket) {
    return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  const formData = new FormData();

  formData.append("status", validatedData.status ?? existingTicket.status);
  formData.append("description", validatedData.description ?? existingTicket.description ?? "");
  formData.append("priority", validatedData.priority ?? existingTicket.priority ?? "");

  if (existingTicket.departmentId) formData.append("departmentId", existingTicket.departmentId);
  if (existingTicket.categoryId) formData.append("categoryId", existingTicket.categoryId);
  if (existingTicket.assignedToId) formData.append("assignedToId", existingTicket.assignedToId);

  formData.append("remark", validatedData.remark ?? existingTicket.remark ?? "");

  // 🌟 withAuth မှ ရလာသော userId ကို တိုက်ရိုက် အသုံးပြုပါမည်
  const result = await updateTicket(id, formData, {
    actorUserId: userId,
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to update ticket" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, data: result.data.updated });
});


// 🌟 GET function ကိုလည်း withAuth ဖြင့် ပတ်လိုက်ပါပြီ
export const GET = withAuth(async (
  request: NextRequest,
  userId: string,
  context: { params: Promise<Params> }
) => {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ success: false, error: "Ticket id is required" }, { status: 400 });
  }

  // လုံခြုံရေးစစ်ဆေးခြင်းများကို withAuth က လုပ်ပေးသွားပြီဖြစ်၍ ဖြုတ်လိုက်ပါသည်

  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        isArchived: false,
        OR: [
          { id: id },
          { ticketId: id }
        ]
      },
      include: {
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
        images: { select: { id: true, url: true } }
      }
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ticket });

  } catch (error) {
    console.error("[get-single-ticket-api-error]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ticket." }, { status: 500 });
  }
});