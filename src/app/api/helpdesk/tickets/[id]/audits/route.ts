import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/libs/api-auth-wrapper"; // 🌟 withAuth ကို Import လုပ်ပါမည်
import { getTicketAuditLogs } from "@/app/helpdesk/tickets/_lib/queries";

interface Params {
  id: string;
}



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
    const Audit = await getTicketAuditLogs(id);

    if (!Audit) {
      return NextResponse.json({ success: false, error: "Audit logs not found" }, { status: 404 });
    }


    return NextResponse.json({ success: true, data: Audit });

  } catch (error) {
    console.error("[get-single-ticket-api-error]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ticket." }, { status: 500 });
  }
});