// import { getTicketAuditLogs } from "@/app/helpdesk/tickets/action";
import { TicketFormData } from "@/app/helpdesk/tickets/ticket.schema";
import { Audit } from "@/generated/prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";

const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.npm_lifecycle_event ?? "").startsWith("start");
const envPath =
    isProduction && fs.existsSync(".env.production") ? ".env.production" : ".env";
dotenv.config({ path: envPath });

process.on("warning", (warning) => {
    const { code } = warning as NodeJS.ErrnoException;
    if (code === "DEP0169") return;
    console.warn(warning);
});

const server = http.createServer();
const PORT = Number(process.env.WEB_SOCKET_PORT || process.env.NEXT_PUBLIC_WEB_SOCKET_PORT) || 3010;
const SOCKET_PATH = process.env.WEB_SOCKET_PATH || process.env.NEXT_PUBLIC_WEB_SOCKET_PATH || "/socket.io";
const corsOrigin = process.env.WEB_SOCKET_CORS_ORIGIN || "*";
const SOCKET_TOKEN = process.env.WEB_SOCKET_TOKEN || process.env.NEXT_PUBLIC_WEB_SOCKET_TOKEN;

const io = new Server(server, {
    path: SOCKET_PATH,
    cors: {
        origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((origin) => origin.trim()),
        methods: ["GET", "POST"],
    },
});

io.use((socket, next) => {
    if (!SOCKET_TOKEN) {
        return next(new Error("Socket auth not configured"));
    }

    const token =
        (socket.handshake.auth as { token?: string } | undefined)?.token ??
        (socket.handshake.query?.token as string | undefined);

    if (token !== SOCKET_TOKEN) {
        return next(new Error("Unauthorized"));
    }

    return next();
});

io.on("connection", (socket) => {
    socket.on("join-ticket", (ticketId: string) => {
        socket.join(`ticket:${ticketId}`);
    });

    socket.on("typing", (data: { ticketId: string; userName: string }) => {
        socket.to(`ticket:${data.ticketId}`).emit("user-typing", data);
    });

    socket.on("send-comment", (comment) => {
        io.to(`ticket:${comment.ticketId}`).emit("new-comment", comment);
    });



    socket.on("update-ticket", (data: { id: string; audit: Audit; ticket: TicketFormData }) => {
        // broadcast to the ticket room
        io.to(`ticket:${data.id}`).emit("ticket-updated", data.audit, data.ticket);
    });

    socket.on("tickets-changed", (payload) => {
        io.emit("tickets-changed", payload);
    });

    socket.on("alerts-changed", (payload) => {
        io.emit("alerts-changed", payload);
    });

    socket.on("sla-violations", (payload) => {
        io.emit("sla-violations", payload);
    });



});

server.listen(PORT, "0.0.0.0");
