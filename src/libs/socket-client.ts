// /libs/socket-client.ts

"use client";

import { io, Socket } from "socket.io-client";
import type { CommentWithRelations } from "@/components/CommentSection";
import { Audit } from "@/generated/prisma/client";

let socket: Socket | null = null;
const SOCKET_PATH = process.env.NEXT_PUBLIC_WEB_SOCKET_PATH || "/socket.io";
const SOCKET_TOKEN = process.env.NEXT_PUBLIC_WEB_SOCKET_TOKEN;

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

        const options = {
            path: SOCKET_PATH,
            autoConnect: false, // we will connect manually
            transports: ["websocket", "polling"],
            auth: SOCKET_TOKEN ? { token: SOCKET_TOKEN } : undefined,
        };

        socket = url ? io(url, options) : io(options);

        socket.connect();
    }
    return socket;
}

// Join a ticket room
export function joinTicket(ticketId: string) {
    const sock = getSocket();
    if (sock.connected) {
        sock.emit("join-ticket", ticketId);
    } else {
        sock.once("connect", () => {
            sock.emit("join-ticket", ticketId);
        });
    }
}

// Emit typing
export function emitTyping(ticketId: string, userName: string) {
    const sock = getSocket();
    if (!sock.connected) {
        sock.once("connect", () => {
            sock.emit("typing", { ticketId, userName });
        });
    } else {
        sock.emit("typing", { ticketId, userName });
    }
}



export function emitNewComment(comment: CommentWithRelations) {
    const sock = getSocket();

    const send = () => {
        sock.emit("send-comment", comment);
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
    };

    if (!sock.connected) {
        sock.once("connect", send);
    } else {
        send();
    }
}
