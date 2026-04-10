import { NextResponse } from "next/server";
import { POST as zabbixWebhookPost } from "../../zabbix/route";

// Backward-compatible alias:
// older integrations still POST to /api/alerts/sync.
export const POST = zabbixWebhookPost;

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "This endpoint only accepts POST webhook payloads.",
      hint: "Use POST /api/alerts/sync (alias) or POST /api/zabbix",
    },
    { status: 405 },
  );
}
