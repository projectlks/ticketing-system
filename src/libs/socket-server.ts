// import { getTicketAuditLogs } from "@/app/helpdesk/tickets/action";
import { TicketFormData } from "@/app/helpdesk/tickets/ticket.schema";
import { Audit } from "@/generated/prisma/client";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const server = http.createServer();
const PORT = Number(process.env.WEB_SOCKET_PORT || process.env.NEXT_PUBLIC_WEB_SOCKET_PORT) || 3010;
const SOCKET_PATH = process.env.WEB_SOCKET_PATH || process.env.NEXT_PUBLIC_WEB_SOCKET_PATH || "/socket.io";
const corsOrigin = process.env.WEB_SOCKET_CORS_ORIGIN || "*";

const io = new Server(server, {
    path: SOCKET_PATH,
    cors: {
        origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((origin) => origin.trim()),
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

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



});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`⚡ Socket server running on 0.0.0.0:${PORT} path=${SOCKET_PATH}`);
});
