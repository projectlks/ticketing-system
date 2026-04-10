
import fs from "fs";
import https from "https";
import { constants } from "crypto";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { NextResponse } from "next/server";
import path from "path";

// ဒီ type က DynamicField.Value မှာလက်ခံမယ့် data type အမျိုးအစားတွေကို သတ်မှတ်တာပါ။
// (string/number/boolean/null ပဲလက်ခံမယ်)
type Primitive = string | number | boolean | null;

// OTRS DynamicField array ထဲက item တစ်ခုရဲ့ပုံစံ
type DynamicFieldItem = {
    Name: string;
    Value: Primitive;
};

// Ticket object က key/value လာနိုင်လို့ generic object အဖြစ်ထားတာပါ။
type TicketPayload = Record<string, unknown>;

// Client က POST body ထဲပို့လာနိုင်တဲ့ fields တွေ
// - Ticket / DynamicField က အဓိက
// - Article/Message စတာတွေက Subject/Body တည်ဆောက်ဖို့ fallback အနေနဲ့သုံးမယ်
type ZabbixRequestBody = {
    Ticket?: TicketPayload;
    DynamicField?: unknown;
    Article?: {
        Subject?: string;
        Body?: string;
    };
    Message?: string;
    PreparedMessage?: string;
    EventTime?: string;
    EventDateTime?: string;
    Timestamp?: string;
    TriggerClient?: string;
    TriggerGroups?: string;
};

// Environment variables ကနေဖတ်မယ့် OTRS config shape
type OtrsConfig = {
    baseUrl: string;
    userLogin: string;
    password: string;
    fromEmail: string;
    pfxPath: string;
    pfxPassphrase: string;
    rejectUnauthorized: boolean;
    caPath?: string;
    defaultQueueId?: string | number;
};

type OtrsApiError = {
    code: string | null;
    message: string;
};

const MASKED_VALUE = "********";
const SENSITIVE_LOG_KEYS = new Set([
    "password",
    "passphrase",
    "authorization",
    "token",
    "apikey",
    "api_key",
]);

function recoverComposedPassword(value: string): string {
    // Docker Compose may interpolate `$_` using host env `_` (often `/usr/bin/docker`).
    // Recover intended literal pattern for passwords that contain `$_`.
    const shellUnderscore = process.env._?.trim();
    if (shellUnderscore) {
        const expanded = `$${shellUnderscore}`;
        if (value.includes(expanded)) {
            return value.split(expanded).join("$_");
        }
    }

    // Common fallback when compose expands `$_` to default docker binary path.
    if (value.includes("$/usr/bin/docker")) {
        return value.split("$/usr/bin/docker").join("$_");
    }

    return value;
}

// Zabbix integration အတွက် မဖြစ်မနေပါရမယ့် DynamicField name များ
const REQUIRED_DYNAMIC_FIELDS = [
    "ZabbixState",
    "ZabbixTrigger",
    "ZabbixEvent",
    "ZabbixHost",
] as const;

// Ticket create လုပ်ချိန် မဖြစ်မနေလိုအပ်တဲ့ Ticket fields များ
const REQUIRED_CREATE_TICKET_FIELDS = [
    "Title",
    "Service",
    "State",
    "Priority",
    "CustomerUser",
    "Type",
] as const;

// Certificate folder / default file path / OTRS base URL
const certDirectory = path.join(process.cwd(), "src/certs");
const defaultPfxPath = path.join(certDirectory, "Test.pfx");
const defaultBaseUrl =
    "https://support-test.eastwind.ru/nph-genericinterface.pl/Webservice/EWChatbot";

// Mandatory env var တစ်ခုကိုဖတ်ပြီး မရှိရင် error ပစ်မယ်။
// Integration credential မပြည့်စုံဘူးဆိုတာ early fail လုပ်ဖို့
function getRequiredEnv(name: string): string | null {
    const value = process.env[name];
    if (!value || !value.trim()) {
        return null;
    }
    return value.trim();
}

// string မဟုတ်၊ အလွတ် string မဟုတ်ဆိုတာကိုစစ်တဲ့ helper
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

// object ပုံစံဟုတ်/မဟုတ် စစ်တဲ့ helper
// array / null တွေကို object မဟုတ်တဲ့အဖြစ် ပြန်ပေးထားတယ်
function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

function redactSensitiveForLog(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => redactSensitiveForLog(entry));
    }

    const obj = asObject(value);
    if (!obj) {
        return value;
    }

    const output: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(obj)) {
        if (SENSITIVE_LOG_KEYS.has(key.toLowerCase())) {
            output[key] = MASKED_VALUE;
            continue;
        }
        output[key] = redactSensitiveForLog(entryValue);
    }

    return output;
}

function logOutgoingOtrsPayload(
    requestId: string,
    endpoint: string,
    payload: Record<string, unknown>
): void {
    redactSensitiveForLog(payload);
 
}

function extractOtrsApiError(value: unknown): OtrsApiError | null {
    const root = asObject(value);
    if (!root) {
        return null;
    }
    const errorObj = asObject(root.Error);
    if (!errorObj) {
        return null;
    }

    const message = isNonEmptyString(errorObj.ErrorMessage)
        ? errorObj.ErrorMessage.trim()
        : "Unknown OTRS API error";
    const code = isNonEmptyString(errorObj.ErrorCode)
        ? errorObj.ErrorCode.trim()
        : null;

    return { code, message };
}

// QueueID ကို search payload ထဲပို့လို့ရတဲ့ string/number အဖြစ် normalize လုပ်မယ်။
// မရရင် null ပြန်ပေးမယ်။
function normalizeQueueId(value: unknown): string | number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (isNonEmptyString(value)) {
        const trimmed = value.trim();
        const parsedNumber = Number(trimmed);
        return Number.isNaN(parsedNumber) ? trimmed : parsedNumber;
    }
    return null;
}

// DynamicField input ကို strict format နဲ့ normalize လုပ်မယ်။
// format မမှန်တဲ့ item တစ်ခုခုတွေ့ရင် null ပြန်ပြီး validation fail လုပ်မယ်။
function normalizeDynamicFields(value: unknown): DynamicFieldItem[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    const normalized: DynamicFieldItem[] = [];
    for (const item of value) {
        const row = asObject(item);
        if (!row || !isNonEmptyString(row.Name)) {
            return null;
        }

        const fieldValue = row.Value;
        const validType =
            fieldValue === null ||
            typeof fieldValue === "string" ||
            typeof fieldValue === "number" ||
            typeof fieldValue === "boolean";

        if (!validType) {
            return null;
        }

        normalized.push({
            Name: row.Name.trim(),
            Value: fieldValue as Primitive,
        });
    }

    return normalized;
}

// DynamicField array ကို map ပုံစံ (Name -> Value) ပြောင်းထားမယ်။
// နောက်ပိုင်း validation / comparison လုပ်ရလွယ်အောင်
function mapDynamicFields(fields: DynamicFieldItem[]): Record<string, string> {
    const output: Record<string, string> = {};
    for (const field of fields) {
        output[field.Name] = field.Value === null ? "" : String(field.Value).trim();
    }
    return output;
}

// ZabbixState တန်ဖိုးကို integration logic မှာသုံးမယ့် canonical value သို့ပြောင်းမယ်။
// လက်ခံတန်ဖိုးက PROBLEM / Recovered (case-insensitive)
function normalizeZabbixState(value: string): "PROBLEM" | "Recovered" | null {
    const upper = value.trim().toUpperCase();
    if (upper === "PROBLEM") {
        return "PROBLEM";
    }
    if (upper === "RECOVERED") {
        return "Recovered";
    }
    return null;
}

// Ticket create လုပ်ခါနီး missing mandatory fields စုထုတ်ပေးမယ့် helper
// QueueID သို့မဟုတ် Queue အနည်းဆုံးတစ်ခုမဖြစ်မနေလို
function missingCreateFields(ticket: Record<string, unknown>): string[] {
    const missing: string[] = REQUIRED_CREATE_TICKET_FIELDS.filter(
        (fieldName) => !isNonEmptyString(ticket[fieldName])
    );

    const hasQueueID = normalizeQueueId(ticket.QueueID) !== null;
    const hasQueueName = isNonEmptyString(ticket.Queue);
    if (!hasQueueID && !hasQueueName) {
        missing.push("QueueID or Queue");
    }

    return missing;
}

// ပေးထားတဲ့ value list ထဲက "ပထမဆုံး non-empty string" ကိုထုတ်ယူပေးမယ့် helper
// fallback chain ဆောက်ရာမှာ အသုံးဝင်
function firstNonEmpty(...values: unknown[]): string | null {
    for (const value of values) {
        if (isNonEmptyString(value)) {
            return value.trim();
        }
    }
    return null;
}

// Article Subject တည်ဆောက်မယ်။
// 1) client က subject ပို့လာရင် အဲဒါကိုသုံး
// 2) မပို့လာရင် ZabbixHost/Trigger အခြေခံ fallback subject ဆောက်
function buildArticleSubject(
    state: "PROBLEM" | "Recovered",
    dynamicFieldMap: Record<string, string>,
    incomingSubject: unknown
): string {
    const subject = firstNonEmpty(incomingSubject);
    if (subject) {
        return subject;
    }

    const host = dynamicFieldMap.ZabbixHost || "unknown-host";
    const trigger = dynamicFieldMap.ZabbixTrigger || "unknown-trigger";
    return `${state}: ${host} (${trigger})`;
}

// Article Body တည်ဆောက်မယ်။
// 1) PreparedMessage/Message/Article.Body တစ်ခုခုရှိရင် အဲဒါကိုတိုက်ရိုက်သုံး
// 2) မရှိရင် dynamic fields နဲ့ template body ကို အလိုအလျောက်တည်ဆောက်
function buildArticleBody(
    state: "PROBLEM" | "Recovered",
    dynamicFieldMap: Record<string, string>,
    body: ZabbixRequestBody
): string {
    const manualBody = firstNonEmpty(body.PreparedMessage, body.Message, body.Article?.Body);
    if (manualBody) {
        return manualBody;
    }

    const eventTime = firstNonEmpty(body.EventTime, body.EventDateTime, body.Timestamp);
    const headline = state === "PROBLEM" ? "Problem started" : "Problem recovered";

    const lines = [
        eventTime ? `${headline} at ${eventTime}` : headline,
        `ZabbixState: ${dynamicFieldMap.ZabbixState || state}`,
        `ZabbixTrigger: ${dynamicFieldMap.ZabbixTrigger || "-"}`,
        `ZabbixEvent: ${dynamicFieldMap.ZabbixEvent || "-"}`,
        `ZabbixHost: ${dynamicFieldMap.ZabbixHost || "-"}`,
    ];

    const triggerClient = firstNonEmpty(body.TriggerClient);
    if (triggerClient) {
        lines.push(`Trigger client: ${triggerClient}`);
    }

    const triggerGroups = firstNonEmpty(body.TriggerGroups);
    if (triggerGroups) {
        lines.push(`Trigger groups: ${triggerGroups}`);
    }

    return lines.join("\n");
}

// Environment ကနေ config ဖတ်မယ်။
// secret values တွေကို code မှာ hardcode မထားဘဲ env မှာထားစေဖို့
function loadConfig(): { config?: OtrsConfig; error?: string } {
    const defaultQueueId = normalizeQueueId(process.env.OTRS_DEFAULT_QUEUE_ID);
    const rawPassword = getRequiredEnv("OTRS_PASSWORD");
    if (!rawPassword) {
        return { error: "Missing required environment variable: OTRS_PASSWORD" };
    }
    const recoveredPassword = recoverComposedPassword(rawPassword);

    if (rawPassword !== recoveredPassword) {
        console.warn("[create-ticket] OTRS password interpolation artifact detected and recovered");
    }

    const userLogin = getRequiredEnv("OTRS_USER_LOGIN");
    if (!userLogin) {
        return { error: "Missing required environment variable: OTRS_USER_LOGIN" };
    }
    const fromEmail = getRequiredEnv("OTRS_FROM_EMAIL");
    if (!fromEmail) {
        return { error: "Missing required environment variable: OTRS_FROM_EMAIL" };
    }
    const pfxPassphrase = getRequiredEnv("OTRS_PFX_PASSPHRASE");
    if (!pfxPassphrase) {
        return { error: "Missing required environment variable: OTRS_PFX_PASSPHRASE" };
    }

    return {
        config: {
            baseUrl: process.env.OTRS_BASE_URL?.trim() || defaultBaseUrl,
            userLogin,
            password: recoveredPassword,
            fromEmail,
            pfxPath: process.env.OTRS_PFX_PATH?.trim() || defaultPfxPath,
            pfxPassphrase,
            rejectUnauthorized: process.env.OTRS_REJECT_UNAUTHORIZED !== "false",
            caPath: process.env.OTRS_CA_PATH?.trim(),
            defaultQueueId: defaultQueueId ?? undefined,
        },
    };
}


// HTTPS agent တည်ဆောက်မယ်။
// - Client certificate (.pfx) အသုံးပြု
// - Legacy TLS server အတွက် compatibility options ထည့်
// - OTRS_CA_PATH ပေးထားရင် CA verify လုပ်မယ်
function buildHttpsAgent(config: OtrsConfig): https.Agent {
    const agentOptions: https.AgentOptions = {
        pfx: fs.readFileSync(config.pfxPath),
        passphrase: config.pfxPassphrase,
        rejectUnauthorized: config.rejectUnauthorized,
        minVersion: "TLSv1",
        secureOptions:
            constants.SSL_OP_LEGACY_SERVER_CONNECT |
            constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
    };

    if (config.caPath) {
        agentOptions.ca = fs.readFileSync(config.caPath);
    }

    return new https.Agent(agentOptions);
}



// Ticket update call ကို robust လုပ်ဖို့ helper
// - ပထမ priority: PUT (spec table အတိုင်း)
// - server က PUT မလက်ခံရင် POST fallback လုပ်
// async function sendTicketUpdate(
//     url: string,
//     payload: Record<string, unknown>,
//     requestConfig: AxiosRequestConfig
// ): Promise<{ method: "PUT" | "POST"; response: AxiosResponse }> {
//     try {
//         console.log("payload:", JSON.stringify(payload, null, 2));
//         const response = await axios.post(url, payload, requestConfig);
//         return { method: "POST", response };
//     } catch (error) {
//         if (axios.isAxiosError(error)) {
//             const status = error.response?.status;
//             if (status === 404 || status === 405 || status === 501) {
//                 const response = await axios.post(url, payload, requestConfig);
//                 return { method: "POST", response };
//             }
//         }
//         throw error;
//     }
// }


// retry helper
async function retryAxios<T>(
    fn: () => Promise<{ data?: T; error?: unknown }>,
    maxRetries: number = 5,
    delayMs: number = 1000,
): Promise<{ data?: T; error?: unknown }> {
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
        const result = await fn();
        if (!result.error) {
            return { data: result.data };
        }
        lastError = result.error;
        await new Promise((r) => setTimeout(r, delayMs));
    }
    return { error: lastError };
}

async function sendTicketUpdate(
    url: string,
    payload: Record<string, unknown>,
    requestConfig: AxiosRequestConfig
): Promise<{ data?: { method: "PUT" | "POST"; response: AxiosResponse }; error?: unknown }> {

    return retryAxios(async () => {
        try {
            const response = await axios.post(url, payload, requestConfig);
            return { data: { method: "POST", response } };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 404 || status === 405 || status === 501) {
                    try {
                        const response = await axios.post(url, payload, requestConfig);
                        return { data: { method: "POST", response } };
                    } catch (fallbackError) {
                        return { error: fallbackError };
                    }
                }
            }
            return { error };
        }
    });
}

export async function POST(req: Request) {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
        // Step 1: request body JSON ဖတ်ပြီး Ticket object validate
        const body = (await req.json()) as ZabbixRequestBody;

        const ticket = asObject(body.Ticket);
        // console.log("[create-ticket] request received", {
        //     requestId,
        //     hasTicket: Boolean(ticket),
        //     hasDynamicField: Array.isArray(body.DynamicField),
        // });

        if (!ticket) {
            return NextResponse.json(
                { error: "Invalid request: Ticket must be an object." },
                { status: 400 }
            );
        }

        // Step 2: DynamicField format validate
        const dynamicFields = normalizeDynamicFields(body.DynamicField);
        if (!dynamicFields || dynamicFields.length === 0) {
            return NextResponse.json(
                { error: "Invalid request: DynamicField must be a non-empty array." },
                { status: 400 }
            );
        }

        // Step 3: Mandatory dynamic fields ပါ/မပါ စစ်
        const mappedDynamicFields = mapDynamicFields(dynamicFields);
        const missingDynamicFields = REQUIRED_DYNAMIC_FIELDS.filter(
            (fieldName) => !isNonEmptyString(mappedDynamicFields[fieldName])
        );

        if (missingDynamicFields.length > 0) {
            return NextResponse.json(
                {
                    error: "Invalid request: missing required DynamicField values.",
                    missing: missingDynamicFields,
                },
                { status: 400 }
            );
        }

        // Step 4: ZabbixState ကို canonical value ပြောင်းပြီး လက်ခံတန်ဖိုးစစ်
        const zabbixState = normalizeZabbixState(mappedDynamicFields.ZabbixState);
        if (!zabbixState) {
            return NextResponse.json(
                {
                    error:
                        "Invalid request: DynamicField.ZabbixState must be PROBLEM or Recovered.",
                },
                { status: 400 }
            );
        }

        // Step 5: config + queue id ပြင်ဆင်
        // Ticket.QueueID မပို့ရင် env default queue ကို fallback သုံးမယ်
        const configResult = loadConfig();
        if (!configResult.config) {
            const message = configResult.error ?? "Missing OTRS configuration.";
            return NextResponse.json(
                { error: message, requestId },
                { status: 500 }
            );
        }
        const config = configResult.config;
        const queueId = normalizeQueueId(ticket.QueueID) ?? config.defaultQueueId ?? null;
        // console.log("[create-ticket] config resolved", {
        //     requestId,
        //     baseUrl: config.baseUrl,
        //     userLogin: maskValue(config.userLogin),
        //     fromEmail: config.fromEmail,
        //     pfxPath: config.pfxPath,
        //     rejectUnauthorized: config.rejectUnauthorized,
        //     queueId,
        //     trigger: mappedDynamicFields.ZabbixTrigger,
        //     event: mappedDynamicFields.ZabbixEvent,
        //     host: mappedDynamicFields.ZabbixHost,
        // });
        if (queueId === null) {
            return NextResponse.json(
                {
                    error:
                        "Invalid request: Ticket.QueueID is required for search (or set OTRS_DEFAULT_QUEUE_ID).",
                },
                { status: 400 }
            );
        }

        // OTRS requests အားလုံးအတွက် common axios config
        const requestConfig: AxiosRequestConfig = {
            httpsAgent: buildHttpsAgent(config),
            headers: { "Content-Type": "application/json" },
        };

        // OTRS authentication payload
        const authPayload = {
            UserLogin: config.userLogin,
            Password: config.password,
        };



        // Step 6: အရင် TicketSearch လုပ်ပြီး existing open/new ticket ရှိ/မရှိစစ်
        const searchPayload = {
            ...authPayload,
            States: ["new", "open"],
            QueueIDs: [queueId],
            DynamicField_ZabbixTrigger: {
                Equals: mappedDynamicFields.ZabbixTrigger,
            },
        };

        logOutgoingOtrsPayload(
            requestId,
            `${config.baseUrl}/TicketSearch`,
            searchPayload
        );

        const searchResponse = await axios.post(
            `${config.baseUrl}/TicketSearch`,
            searchPayload,
            requestConfig
        );
        // console.log("[create-ticket] TicketSearch response", {
        //     requestId,
        //     status: searchResponse.status,
        // });

        const searchApiError = extractOtrsApiError(searchResponse.data);
        if (searchApiError) {
            console.log("[create-ticket] TicketSearch API error", {
                requestId,
                code: searchApiError.code,
                message: searchApiError.message,
            });
            return NextResponse.json(
                {
                    action: "failed",
                    error: "OTRS TicketSearch returned an error.",
                    otrsError: { code: searchApiError.code },
                    requestId,
                },
                { status: 502 }
            );
        }

        // Search result ထဲက ပထမဆုံး TicketID ကိုယူ
        const foundTicketIds = Array.isArray(searchResponse.data?.TicketID)
            ? searchResponse.data.TicketID
            : [];
        const existingTicketId =
            foundTicketIds.length > 0 ? String(foundTicketIds[0]) : null;
        // console.log("[create-ticket] TicketSearch parsed", {
        //     requestId,
        //     foundCount: foundTicketIds.length,
        //     existingTicketId,
        // });

        // Step 7: Article subject/body ကို spec-friendly fallback logic နဲ့ တည်ဆောက်
        const articleSubject = buildArticleSubject(
            zabbixState,
            mappedDynamicFields,
            body.Article?.Subject
        );
        const articleBody = buildArticleBody(zabbixState, mappedDynamicFields, body);

        if (existingTicketId) {
            // Step 8A: Ticket တွေ့ရင် update
            // console.log("[create-ticket] existing ticket found, updating", {
            //     requestId,
            //     existingTicketId,
            // });

            const updatePayload = {
                ...authPayload,
                TicketId: existingTicketId,
                Ticket: { Status: zabbixState === "PROBLEM" ? "open" : "Recovery" },
                DynamicField: dynamicFields,
                Article: {
                    From: config.fromEmail,
                    CommunicationChannel: "Internal",
                    SenderType: "customer",
                    Subject: articleSubject,
                    Body: articleBody,
                    ContentType: "text/plain; charset=utf8",
                    MimeType: "text/plain",
                    Charset: "utf8",
                    TimeUnit: 0,
                },
            };

            logOutgoingOtrsPayload(
                requestId,
                `${config.baseUrl}/Ticket/${existingTicketId}`,
                updatePayload
            );

            // PUT -> POST fallback helper နဲ့ update request ပို့
            const updateResult = await sendTicketUpdate(
                `${config.baseUrl}/Ticket/${existingTicketId}`,
                updatePayload,
                requestConfig
            );
            if (updateResult.error || !updateResult.data) {
                console.log("[create-ticket] Ticket update call failed", {
                    requestId,
                    existingTicketId,
                    message: updateResult.error instanceof Error
                        ? updateResult.error.message
                        : String(updateResult.error),
                });
                return NextResponse.json(
                    {
                        action: "failed",
                        error: "OTRS Ticket update failed.",
                        ticketId: existingTicketId,
                        requestId,
                    },
                    { status: 502 }
                );
            }

            const { method, response } = updateResult.data;
            // console.log("[create-ticket] Ticket update response", {
            //     requestId,
            //     method: updateResult.method,
            //     status: updateResult.response.status,
            //     existingTicketId,
            // });

            const updateApiError = extractOtrsApiError(response.data);
            if (updateApiError) {
                console.log("[create-ticket] Ticket update API error", {
                    requestId,
                    existingTicketId,
                    code: updateApiError.code,
                    message: updateApiError.message,
                });
                return NextResponse.json(
                    {
                        action: "failed",
                        error: "OTRS Ticket update returned an error.",
                        ticketId: existingTicketId,
                        otrsError: { code: updateApiError.code },
                        requestId,
                    },
                    { status: 502 }
                );
            }

            // update success response
            // console.log("[create-ticket] update success", {
            //     requestId,
            //     existingTicketId,
            // });
            return NextResponse.json({
                action: "updated",
                method,
                ticketId: existingTicketId,
                data: response.data,
            });
        }

        // Step 8B: Recovered event ဖြစ်ပြီး open/new ticket မတွေ့ရင်
        // doc requirement အတိုင်း create မလုပ်ဘဲ skip လုပ်
        if (zabbixState === "Recovered") {
            return NextResponse.json(
                {
                    action: "skipped",
                    reason:
                        "Recovered event received but no open ticket found. TicketCreate was intentionally skipped.",
                    trigger: mappedDynamicFields.ZabbixTrigger,
                },
                { status: 404 }
            );
        }

        // Step 9: PROBLEM event ဖြစ်ပြီး existing ticket မရှိမှ create လုပ်
        // create မတင်ခင် Ticket mandatory fields စစ်
        const missingFields = missingCreateFields(ticket);
        if (missingFields.length > 0) {
            return NextResponse.json(
                {
                    error: "Invalid request: missing required Ticket fields for create.",
                    missing: missingFields,
                },
                { status: 400 }
            );
        }

        // Ticket create payload
        const createPayload = {
            ...authPayload,
            Ticket: ticket,
            DynamicField: dynamicFields,
            Article: {
                Subject: articleSubject,
                SenderType: "customer",
                From: config.fromEmail,
                Body: articleBody,
                ContentType: "text/plain; charset=utf8",
                MimeType: "text/plain",
                Charset: "utf8",
                TimeUnit: 0,
            },
        };

        logOutgoingOtrsPayload(
            requestId,
            `${config.baseUrl}/Ticket`,
            createPayload
        );

        // create request
        const createResponse = await axios.post(
            `${config.baseUrl}/Ticket`,
            createPayload,
            requestConfig
        );
        // console.log("[create-ticket] Ticket create response", {
        //     requestId,
        //     status: createResponse.status,
        // });

        const createApiError = extractOtrsApiError(createResponse.data);
        if (createApiError) {
            console.log("[create-ticket] Ticket create API error", {
                requestId,
                code: createApiError.code,
                message: createApiError.message,
            });
            return NextResponse.json(
                {
                    action: "failed",
                    error: "OTRS Ticket create returned an error.",
                    otrsError: { code: createApiError.code },
                    requestId,
                },
                { status: 502 }
            );
        }

        // create success response
        // console.log("[create-ticket] create success", { requestId });
        return NextResponse.json({
            action: "created",
            method: "POST",
            data: createResponse.data,
        });
    }

    catch (error: unknown) {
        // Axios error ဖြစ်ရင် OTRS status/data ပါ log + response မှာပြန်ပို့
        if (axios.isAxiosError(error)) {
            console.log("[create-ticket] axios failure", {
                requestId,
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            return NextResponse.json(
                {
                    error: "OTRS API call failed",
                    requestId,
                    otrsStatus: error.response?.status ?? null,
                },
                { status: 502 }
            );
        }

        // Axios မဟုတ်တဲ့ error အတွက် generic fallback
        const details = error instanceof Error ? error.message : String(error);
        console.log("[create-ticket] unknown failure", { requestId, details });
        return NextResponse.json(
            { error: "OTRS API call failed", requestId },
            { status: 500 }
        );
    }
}
