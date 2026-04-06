// /libs/socket-client.ts

"use client";

import { io, Socket } from "socket.io-client";
import type { CommentWithRelations } from "@/components/CommentSection";
import { Audit } from "@/generated/prisma/client";

let socket: Socket | null = null;
const SOCKET_PATH = process.env.NEXT_PUBLIC_WEB_SOCKET_PATH || "/socket.io";
const SOCKET_TOKEN = process.env.NEXT_PUBLIC_WEB_SOCKET_TOKEN;
type SocketTransport = "polling" | "websocket";

function parseSocketTransports(
    rawValue: string | undefined,
    fallback: SocketTransport[],
) {
    if (!rawValue) {
        return fallback;
    }

    const transports = rawValue
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is SocketTransport => value === "polling" || value === "websocket");

    return transports.length ? transports : fallback;
}

const SOCKET_TRANSPORTS = parseSocketTransports(
    process.env.NEXT_PUBLIC_WEB_SOCKET_TRANSPORTS,
    process.env.NODE_ENV === "development" ? ["polling", "websocket"] : ["polling"],
);

function resolveSocketUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_WEB_SOCKET_URL?.trim();
    if (configuredUrl) {
        return configuredUrl;
    }

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    return undefined;
}

export function getSocket(): Socket {
    if (!socket) {
        const url = resolveSocketUrl();
        console.log(
            "Connecting to socket at",
            url ?? "same-origin",
            "path",
            SOCKET_PATH,
            "transports",
            SOCKET_TRANSPORTS.join(","),
        );

        const options = {
            path: SOCKET_PATH,
            autoConnect: false, // we will connect manually
            // Cloudflare/proxy websocket upgrades are unreliable in production, so keep the
            // browser client on polling unless explicitly overridden via env.
            transports: SOCKET_TRANSPORTS,
            upgrade: SOCKET_TRANSPORTS.includes("websocket"),
            auth: SOCKET_TOKEN ? { token: SOCKET_TOKEN } : undefined,
        };

        socket = url ? io(url, options) : io(options);

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socket?.id);
        });

        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected");
        });

        socket.on("connect_error", (err) => {
            if (socket?.connected) {
                return;
            }
            console.error("Socket connection error:", err.message);
        });

        socket.connect();
    }
    return socket;
}

// Join a ticket room
export function joinTicket(ticketId: string) {
    const sock = getSocket();
    if (sock.connected) {
        sock.emit("join-ticket", ticketId);
        console.log(`Joined ticket:${ticketId}`);
    } else {
        sock.once("connect", () => {
            sock.emit("join-ticket", ticketId);
            console.log(`Joined ticket:${ticketId} after connect`);
        });
    }
}

// Emit typing
export function emitTyping(ticketId: string, userName: string) {
    const sock = getSocket();
    if (!sock.connected) {
        sock.once("connect", () => {
            sock.emit("typing", { ticketId, userName });
            // console.log("Typing event emitted (after connect)");
        });
    } else {
        sock.emit("typing", { ticketId, userName });
        // console.log("Typing event emitted");
    }
}



export function emitNewComment(comment: CommentWithRelations) {
    const sock = getSocket();

    const send = () => {
        sock.emit("send-comment", comment);
        console.log("New comment sent");
    };

    if (!sock.connected) {
        sock.once("connect", send);
    } else {
        send();
    }
}


export function emitNewUpdateTicket(audit: Audit) {
    const sock = getSocket();

    const send = () => {
        sock.emit("ticket-updated", audit);
        console.log("New ticket update sent", audit);

    };

    if (!sock.connected) {
        sock.once("connect", send);
    } else {
        send();
    }
}
