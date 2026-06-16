import axios, { AxiosInstance } from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// --- Interfaces များ (Strict Typing) ---

export interface OTRSAttachment {
    Content: string; // Base64 encoded string
    ContentType: string;
    Filename: string;
}

export interface OTRSArticle {
    Subject: string;
    SenderType: "customer" | "agent";
    From: string;
    Body: string;
    ContentType: string;
    MimeType: string;
    Charset: string;
    TimeUnit: number;
    ArticleTypeId?: number;
    CommunicationChannel?: "Internal" | "External"; // ဤ field ကို ထည့်ပေးပါ 
    Attachment?: OTRSAttachment[];
}

export interface OTRSTicket {
    Title?: string;
    QueueID?: string;
    Service?: string;
    State?: string;
    Priority?: string;
    Type?: string;
    CustomerUser?: string;
}

export interface OTRSDynamicField {
    Name: string;
    Value: string;
}

// API ခေါ်ဆိုမှုတိုင်းတွင် လိုအပ်သော Payload
export interface OTRSPayload {
    Operation?: string; // 🌟 ဒီ field အသစ်လေး ထည့်ပေးပါ
    UserLogin: string;
    Password: string;
    Ticket?: OTRSTicket;
    Article?: OTRSArticle;
    DynamicField?: OTRSDynamicField[];
    // အခြားလိုအပ်သော Field များရှိပါက ဤနေရာတွင် ထပ်ဖြည့်ပါ
}

// Search အတွက် သီးသန့် Type
export interface OTRSSearchPayload {
    UserLogin: string;
    Password: string;
    States?: string[];
    QueueIDs?: number[];
    DynamicField_ZabbixTrigger?: { Equals: string };
}

// --- HTTPS/TLS Configuration ---

const certPath = process.env.OTRS_PFX_PATH
    ? path.resolve(process.env.OTRS_PFX_PATH)
    : path.join(process.cwd(), "src", "certs", "EWM.pfx");

if (!fs.existsSync(certPath)) {
    console.error(`[OTRS Service Error]: Certificate file not found at ${certPath}`);
}

// PFX ဖိုင်ကိုဖတ်ခြင်း
const pfxFile = fs.existsSync(certPath) ? fs.readFileSync(certPath) : Buffer.alloc(0);

const httpsAgent = new https.Agent({
    pfx: pfxFile,
    passphrase: process.env.OTRS_PFX_PASSPHRASE || "",
    rejectUnauthorized: process.env.OTRS_REJECT_UNAUTHORIZED !== "false",
    minVersion: "TLSv1", // Legacy server များအတွက်လိုအပ်
    secureOptions:
        crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT |
        crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
});

// --- Axios Instance ---

const otrsBaseUrl = process.env.OTRS_BASE_URL || "https://support-test.eastwind.ru/nph-genericinterface.pl/Webservice/EWChatbot";

const otrsClient: AxiosInstance = axios.create({
    baseURL: otrsBaseUrl,
    httpsAgent: httpsAgent,
    headers: { "Content-Type": "application/json" },
});

// --- Exported Service ---

export const otrsService = {
    /**
     * Create a new ticket
     */
    async createTicket(payload: OTRSPayload) {
        return await otrsClient.post("/Ticket", payload);
    },

    /**
     * Update an existing ticket (PUT request)
     */
    async updateTicket(ticketId: string, payload: OTRSPayload) {
        return await otrsClient.post(`/Ticket/${ticketId}`, payload);
    },

    /**
     * Search for tickets
     */
    async searchTicket(payload: OTRSSearchPayload) {
        return await otrsClient.post("/TicketSearch", payload);
    },

    /**
     * Get ticket details
     */
    async getTicket(ticketId: string, loginPayload: { UserLogin: string; Password: string }) {
        return await otrsClient.get(`/Ticket/${ticketId}`, { data: loginPayload });
    }
};