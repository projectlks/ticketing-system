// /libs/socket-client.ts

"use client";

import { io, Socket } from "socket.io-client";
import type { CommentWithRelations } from "@/components/CommentSection";
import { Audit } from "@/generated/prisma/client";

let socket: Socket | null = null;
const SOCKET_PATH = process.env.NEXT_PUBLIC_WEB_SOCKET_PATH || "/socket.io";

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
        console.log("Connecting to socket at", url ?? "same-origin", "path", SOCKET_PATH);

        const options = {
            path: SOCKET_PATH,
            autoConnect: false, // we will connect manually
            transports: ["websocket", "polling"],
        };

        socket = url ? io(url, options) : io(options);

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socket?.id);
        });

        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected");
        });

        socket.on("connect_error", (err) => {
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
