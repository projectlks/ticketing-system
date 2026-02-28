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
export async function POST(req: NextRequest) {

    console.log("Received Zabbix webhook");

    try {
        const body: WebhookPayload = await req.json();


        const event = body.event;
        const trigger = body.trigger ?? {};
        const host = body.host ?? {};
        const item = body.item ?? {};

        if (!event?.id) {
            return NextResponse.json(
                { success: false, message: "Missing event id" },
                { status: 400 }
            );
        }

        const clock = event.datetime
            ? new Date(event.datetime)
            : new Date();

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

        const ticketResponse = await fetch(`${process.env.BASE_URL}/api/create-ticket`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
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
            }),
        });



        // Parse the response from /create-ticket
        const ticketData = await ticketResponse.json();


        // Assume the response looks like: { success: true, otrs_ticketId: 123456 }
        console.log("Ticket creation response:", ticketData);
        if (ticketData.action !== "updated") {


            const otrsTicketId = ticketData.data.TicketID;

            console.log("OTRS Ticket ID 1231232313132:", otrsTicketId);
            // Update the database with the OTRS ticket ID
            await prisma.zabbixTicket.update({
                where: {
                    triggerId_hostName: {
                        triggerId: trigger.id ?? "unknown",
                        hostName: host.name ?? "unknown"
                    }
                },
                data: { otrsTicketId: otrsTicketId ?? null },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}