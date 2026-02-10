// /libs/socket-client.ts
import { io, Socket } from "socket.io-client";
import type { CommentWithRelations } from "@/components/CommentSection";
import { Audit } from "@/generated/prisma/client";

let socket: Socket | null = null;

// Get a singleton socket instance
export function getSocket(): Socket {
    if (!socket) {
        socket = io("http://192.168.100.107:3001", {
            autoConnect: false, // we will connect manually
        });

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socket?.id);
        });

        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected");
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
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
