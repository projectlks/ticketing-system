import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

import { prisma } from "@/libs/prisma";
import { getCurrentUserId } from "@/libs/action";
import { updateTicket } from "@/app/helpdesk/tickets/action";

interface Params {
  id: string;
}

// ၁။ အားလုံးကို .optional() ပေးထားသောကြောင့် မပြင်ချင်သော Field များကို ထည့်ပို့ရန်မလိုပါ။
const UpdateTicketPayloadSchema = z.object({
  status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]).optional(),
  description: z.string().optional(),
  // သင့် System ရှိ Priority များကို လိုအပ်သလို အတိုးအလျှော့လုပ်ပါ 
  priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]).optional(),
  remark: z.string().optional(),
}).refine((data) => {
  // Priority ကို ထည့်ပို့ထားလျှင် Remark သည် မဖြစ်မနေ ပါရမည်။ မပါလျှင် Error ပြမည်။
  if (data.priority && (!data.remark || data.remark.trim() === "")) return false;
  return true;
}, {
  message: "Remark is required when changing priority.",
  path: ["remark"],
});

type UpdateTicketPayload = z.infer<typeof UpdateTicketPayloadSchema>;

/**
 * Header ထဲမှ Basic Auth (Email:Password) ကို ဖတ်ပြီး User ကို ရှာပေးသည့် Function
 */
async function getUserIdFromBasicAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [email, password] = credentials.split(":");

    if (!email || !password) return null;

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || user.isArchived || !user.password) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user.id : null;
  } catch (error) {
    return null;
  }
}

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

  // Authentication စစ်ဆေးခြင်း
  const sessionUserId = await getCurrentUserId();
  const basicAuthUserId = await getUserIdFromBasicAuth(request);
  const finalActorId = sessionUserId || basicAuthUserId;

  if (!finalActorId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid credentials or session" },
      { status: 401 },
    );
  }

  // JSON ဖတ်ခြင်း
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validation စစ်ဆေးခြင်း
  const resultParse = UpdateTicketPayloadSchema.safeParse(jsonBody);
  if (!resultParse.success) {
    return NextResponse.json(
      {
        success: false,
        error: resultParse.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const validatedData: UpdateTicketPayload = resultParse.data;

  // ၂။ Database မှ လက်ရှိ Ticket ကို ဆွဲထုတ်ခြင်း (Action တွင် Error မတက်စေရန်)
  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!existingTicket) {
    return NextResponse.json(
      { success: false, error: "Ticket not found" },
      { status: 404 },
    );
  }

  // ၃။ FormData ကို တည်ဆောက်ခြင်း
  const formData = new FormData();

  formData.append("title", existingTicket.title);
  formData.append("status", validatedData.status ?? existingTicket.status);
  formData.append("description", validatedData.description ?? existingTicket.description ?? "");
  formData.append("priority", validatedData.priority ?? existingTicket.priority ?? "");

  if (existingTicket.departmentId) formData.append("departmentId", existingTicket.departmentId);
  if (existingTicket.categoryId) formData.append("categoryId", existingTicket.categoryId);
  if (existingTicket.assignedToId) formData.append("assignedToId", existingTicket.assignedToId);

  // အသစ်ပို့လိုက်တဲ့ remark မရှိရင် အဟောင်းကို ယူမယ်၊ အဟောင်းမှမရှိရင် "" ကို ယူမယ်
  formData.append("remark", validatedData.remark ?? existingTicket.remark ?? "");

  // Update Action ကို ခေါ်ယူခြင်း
  const result = await updateTicket(id, formData, {
    actorUserId: finalActorId,
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



// ... အပေါ်က import တွေ အတိုင်းထားပါ ...

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Ticket id is required" },
      { status: 400 }
    );
  }

  // ၁။ လုံခြုံရေး စစ်ဆေးခြင်း (Authentication)
  const sessionUserId = await getCurrentUserId();
  const basicAuthUserId = await getUserIdFromBasicAuth(request);
  const finalActorId = sessionUserId || basicAuthUserId;

  if (!finalActorId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid credentials or session" },
      { status: 401 }
    );
  }

  try {
    // ၂။ Database ထဲတွင် ID ဖြင့် အတိအကျရှာခြင်း (id သို့မဟုတ် ticketId နှစ်မျိုးလုံးကို လက်ခံသည်)
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

    // ၃။ ရှာမတွေ့ပါက Error ပြန်ပေးမည်
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    // ၄။ အောင်မြင်စွာ တွေ့ရှိပါက Ticket Data ကို ပြန်ပေးမည်
    return NextResponse.json({
      success: true,
      data: ticket,
    });

  } catch (error) {
    console.error("[get-single-ticket-api-error]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ticket." },
      { status: 500 }
    );
  }
}