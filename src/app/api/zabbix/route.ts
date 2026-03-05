import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";


type WebhookTag = {
    tag: string;
    value: string;
};

type WebhookEvent = {
    id: string;
    status?: string;
    value?: string;
    datetime?: string;
};

type WebhookTrigger = {
    id?: string;
    name?: string;
    description?: string;
    status?: string;
    severity?: string;
};

type WebhookHost = {
    id?: string;
    name?: string;
    ip?: string;
    group?: string;
    inventory_tag?: string;
};

type WebhookItem = {
    id?: string;
    name?: string;
    key?: string;
    value?: string;
};

type WebhookPayload = {
    event: WebhookEvent;
    trigger?: WebhookTrigger;
    host?: WebhookHost;
    item?: WebhookItem;
    tags?: WebhookTag[] | string;
};

type CreateTicketResponse = {
    action?: "created" | "updated" | "skipped" | "failed";
    ticketId?: string | number;
    error?: string;
    reason?: string;
    otrsError?: {
        code?: string | null;
        message?: string;
    };
    data?: {
        TicketID?: string | number;
        Error?: {
            ErrorMessage?: string;
            ErrorCode?: string;
        };
    };
};

function normalizeTicketId(value: unknown): string | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }
    return null;
}

function parseWebhookDatetime(value: string | undefined): Date | null {
    if (!value) {
        return new Date();
    }

    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
        return direct;
    }

    const matched = value.match(/^(\d{4})\.(\d{2})\.(\d{2})\s?(\d{2}:\d{2}:\d{2})$/);
    if (!matched) {
        return null;
    }

    const [, year, month, day, time] = matched;
    const normalized = `${year}-${month}-${day}T${time}Z`;
    const reparsed = new Date(normalized);
    return Number.isNaN(reparsed.getTime()) ? null : reparsed;
}

export async function POST(req: NextRequest) {
    // console.log("[zabbix] webhook received");

    try {
        const body: WebhookPayload = await req.json();
        // console.log("[zabbix] payload(raw)", body);

        const event = body.event;
        const trigger = body.trigger ?? {};
        const host = body.host ?? {};
        const item = body.item ?? {};

        // console.log("[zabbix] payload(summary)", {
        //     eventId: event?.id,
        //     eventStatus: event?.status,
        //     eventValue: event?.value,
        //     eventDatetime: event?.datetime,
        //     triggerId: trigger?.id,
        //     triggerName: trigger?.name,
        //     hostName: host?.name,
        //     itemId: item?.id,
        //     hasTags: Boolean(body.tags),
        // });

        if (!event?.id) {
            // console.error("[zabbix] validation failed: missing event.id");
            return NextResponse.json(
                { success: false, message: "Missing event id" },
                { status: 400 }
            );
        }

        const clock = parseWebhookDatetime(event.datetime);

        if (!clock) {
            // console.error("[zabbix] invalid event datetime", { eventDatetime: event.datetime });
            return NextResponse.json(
                { success: false, message: "Invalid event datetime" },
                { status: 400 }
            );
        }

        const status =
            event.status?.toLowerCase() === "resolved" ||
                event.value === "0"
                ? "1"
                : "0";

        let tagsString: string | null = null;

        if (Array.isArray(body.tags)) {
            tagsString = body.tags
                .map((t) => `${t.tag}:${t.value}`)
                .join(",");
        } else if (typeof body.tags === "string") {
            tagsString = body.tags;
        }

        const last5Values = item.value
            ? `1: ${item.value} (${item.name ?? ""})`
            : null;

        // console.log("[zabbix] upsert start", {
        //     upsertKey: {
        //         triggerId: trigger.id ?? "unknown",
        //         hostName: host.name ?? "unknown",
        //     },
        //     status,
        //     clock: clock.toISOString(),
        // });

        await prisma.zabbixTicket.upsert({
            where: {
                triggerId_hostName: {
                    triggerId: trigger.id ?? "unknown",
                    hostName: host.name ?? "unknown"
                }
            },
            update: {
                name: trigger.name ?? `Zabbix Event ${event.id}`,
                status,
                clock,

                triggerId: trigger.id ?? null,
                triggerName: trigger.name ?? null,
                triggerDesc: trigger.description ?? null,
                triggerStatus: trigger.status ?? null,
                triggerSeverity: trigger.severity ?? null,

                hostName: host.name ?? null,
                hostTag: host.inventory_tag ?? null,
                hostGroup: host.group ?? null,

                itemId: item.id ?? null,
                itemName: item.name ?? null,
                itemDescription: item.key ?? null,
                last5Values,
                tags: tagsString,
            },
            create: {
                eventid: event.id,
                name: trigger.name ?? `Zabbix Event ${event.id}`,
                status,
                clock,

                triggerId: trigger.id ?? null,
                triggerName: trigger.name ?? null,
                triggerDesc: trigger.description ?? null,
                triggerStatus: trigger.status ?? null,
                triggerSeverity: trigger.severity ?? null,

                hostName: host.name ?? null,
                hostTag: host.inventory_tag ?? null,
                hostGroup: host.group ?? null,

                itemId: item.id ?? null,
                itemName: item.name ?? null,
                itemDescription: item.key ?? null,
                last5Values,
                tags: tagsString,
            },
        });

        // console.log("[zabbix] upsert success", {
        //     eventId: event.id,
        //     triggerId: trigger.id ?? "unknown",
        //     hostName: host.name ?? "unknown",
        // });

        const severityMap: Record<string, string> = {
            Disaster: "1 Critical",
            High: "2 High",
            Average: "3 Medium",
            Warning: "4 Low",
            Information: "5 Very Low",
        };

        const ticketPriority = trigger.severity
            ? severityMap[trigger.severity as string] ?? "3 Medium"
            : "3 Medium";

        const ticketState =
            event.status?.toLowerCase() === "resolved" || event.value === "0"
                ? "recovery"  // already recovered
                : "new";      // problem

        const createTicketPayload = {
            Ticket: {
                Title: trigger.name ?? "Monitoring Problem",
                QueueID: "96",
                Service: "CEIR",
                State: ticketState,
                Priority: ticketPriority,
                Type: "Incident",
                CustomerUser: "support@eastwindmyanmar.com.mm",
            },

            DynamicField: [
                {
                    Name: "ZabbixState",
                    Value: status === "0" ? "PROBLEM" : "Recovered",
                },
                {
                    Name: "ZabbixTrigger",
                    Value: trigger.id ?? "",
                },
                {
                    Name: "ZabbixEvent",
                    Value: event.id,
                },
                {
                    Name: "ZabbixHost",
                    Value: host.name ?? "",
                },
            ],

            EventTime: event.datetime ?? new Date().toISOString(),
            TriggerClient: host.inventory_tag ?? "",
            TriggerGroups: host.group ?? "",
        };

        const configuredBaseUrl = process.env.BASE_URL?.trim();
        const primaryCreateTicketUrl = configuredBaseUrl
            ? `${configuredBaseUrl}/api/create-ticket`
            : "http://127.0.0.1:3000/api/create-ticket";
        const localFallbackCreateTicketUrl = "http://127.0.0.1:3000/api/create-ticket";

        const callCreateTicket = async (url: string) => {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(createTicketPayload),
            });

            const responseText = await response.text();
            const contentType = response.headers.get("content-type") ?? "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `create-ticket returned non-JSON from ${url} (status ${response.status}): ${responseText.slice(0, 160)}`
                );
            }

            return {
                url,
                status: response.status,
                data: JSON.parse(responseText),
            };
        };

        let createTicketResult: {
            url: string;
            status: number;
            data: unknown;
        };

        try {
            createTicketResult = await callCreateTicket(primaryCreateTicketUrl);
        } catch (primaryError) {
            if (primaryCreateTicketUrl === localFallbackCreateTicketUrl) {
                throw primaryError;
            }
            console.error("[zabbix] create-ticket primary call failed, retrying localhost", {
                primaryCreateTicketUrl,
                reason: primaryError instanceof Error ? primaryError.message : String(primaryError),
            });
            createTicketResult = await callCreateTicket(localFallbackCreateTicketUrl);
        }

        const ticketData = createTicketResult.data as CreateTicketResponse;
        // console.log("[zabbix] create-ticket response", {
        //     status: createTicketResult.status,
        //     action: ticketData?.action,
        //     url: createTicketResult.url,
        // });

        if (ticketData.action === "skipped") {
            console.warn("[zabbix] create-ticket skipped", {
                reason: ticketData.reason,
                triggerId: trigger.id ?? "unknown",
            });
            return NextResponse.json({
                success: true,
                action: "skipped",
                reason: ticketData.reason ?? null,
            });
        }

        const createTicketErrorMessage =
            ticketData?.error ||
            ticketData?.otrsError?.message ||
            ticketData?.data?.Error?.ErrorMessage ||
            (createTicketResult.status >= 400 ? `create-ticket status ${createTicketResult.status}` : null);

        if (createTicketErrorMessage) {
            const errorCode = ticketData?.otrsError?.code ?? ticketData?.data?.Error?.ErrorCode;
            throw new Error(
                errorCode
                    ? `${createTicketErrorMessage} (${errorCode})`
                    : createTicketErrorMessage
            );
        }

        const otrsTicketId =
            normalizeTicketId(ticketData?.data?.TicketID) ??
            normalizeTicketId(ticketData?.ticketId);

        // console.log("[zabbix] parsed OTRS ticket id", { otrsTicketId });

        if (otrsTicketId) {
            await prisma.zabbixTicket.update({
                where: {
                    triggerId_hostName: {
                        triggerId: trigger.id ?? "unknown",
                        hostName: host.name ?? "unknown"
                    }
                },
                data: { otrsTicketId },
            });
            // console.log("[zabbix] db updated with OTRS ticket id", {
            //     triggerId: trigger.id ?? "unknown",
            //     hostName: host.name ?? "unknown",
            //     otrsTicketId,
            // });
        } else {
            console.warn("[zabbix] create-ticket succeeded but no TicketID returned", {
                action: ticketData?.action,
                eventId: event.id,
            });
        }

        // console.log("[zabbix] webhook processing success", { eventId: event.id });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[zabbix] webhook processing failed", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            failedAt: new Date().toISOString(),
        });

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
