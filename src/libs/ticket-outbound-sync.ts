type TicketOutboundEvent = "created" | "updated";

type TicketOutboundSyncParams = {
  event: TicketOutboundEvent;
  ticketId: string;
  ticket: unknown;
};

type TicketOutboundSyncResult = {
  ok: boolean;
  skipped: boolean;
  status?: number;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 10_000;

const toNumberOrDefault = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export async function syncTicketOutbound(
  params: TicketOutboundSyncParams,
): Promise<TicketOutboundSyncResult> {

  console.log("syncTicketOutbound called with params:");
  console.log(params.ticket)


  const endpoint = process.env.TICKET_OUTBOUND_API_URL?.trim();
  if (!endpoint) {
    return { ok: true, skipped: true };
  }

  const timeoutMs = toNumberOrDefault(
    process.env.TICKET_OUTBOUND_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  );
  const token = process.env.TICKET_OUTBOUND_API_TOKEN?.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);




  try {
    // const response = await fetch(endpoint, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     ...(token ? { Authorization: `Bearer ${token}` } : {}),
    //   },
    //   body: JSON.stringify({
    //     source: "ticket_v2",
    //     event: params.event,
    //     sentAt: new Date().toISOString(),
    //     ticketId: params.ticketId,
    //     ticket: params.ticket,
    //   }),
    //   signal: controller.signal,
    // });

    // if (!response.ok) {
    //   const responseText = await response.text();
    //   return {
    //     ok: false,
    //     skipped: false,
    //     status: response.status,
    //     error: responseText.slice(0, 400),
    //   };
    // }


    return {
      ok: true,
      skipped: false,
      // status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
