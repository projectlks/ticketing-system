// import { Server as IOServer } from "socket.io";
// import type { Server as HTTPServer } from "http";
// import type { Socket as NetSocket } from "net";
// // import { prisma } from "./prisma";




// export type SocketServer = HTTPServer & { io?: IOServer };
// export type SocketWithIO = NetSocket & { server: SocketServer };

// export function initSocket(server: SocketServer) {
//     if (!server.io) {
//         const io = new IOServer(server, {
//             path: "/api/socket/io",
//             cors: { origin: "*" },
//         });

//         server.io = io;

//         io.on("connection", (socket) => {
//             console.log("Connected:", socket.id);

//             socket.on("join-ticket", (ticketId: string) => {
//                 socket.join(`ticket:${ticketId}`);
//             });

//             // Typing event
//             socket.on("typing", (data: { ticketId: string; userName: string }) => {
//                 socket.to(`ticket:${data.ticketId}`).emit("user-typing", data);
//             });

//             // New comment event
//             socket.on("new-comment", (comment) => {
//                 io.to(`ticket:${comment.ticketId}`).emit("new-comment", comment);
//             });
//         });


//         // io.on("connection", (socket) => {
//         //     console.log("✅ Connected:", socket.id);

//         //     socket.on("join-ticket", (ticketId: string) => {
//         //         socket.join(`ticket:${ticketId}`);
//         //     });

//         //     socket.on("send-comment", async (data) => {
//         //         const comment = await prisma.comment.create({
//         //             data: {
//         //                 content: data.content || "",
//         //                 imageUrl: data.imageUrl || "",
//         //                 ticketId: data.ticketId,
//         //                 parentId: data.parentId || null,
//         //                 commenterId: data.commenterId,
//         //             },
//         //             include: {
//         //                 commenter: true,
//         //                 replies: true,
//         //                 likes: true,
//         //             },
//         //         });

//         //         io.to(`ticket:${data.ticketId}`).emit("new-comment", comment);
//         //     });

//         //     socket.on("like-comment", async ({ commentId, userId }) => {
//         //         // toggle like
//         //         const existing = await prisma.commentLike.findUnique({
//         //             where: { commentId_userId: { commentId, userId } },
//         //         });

//         //         if (existing) {
//         //             await prisma.commentLike.delete({
//         //                 where: { commentId_userId: { commentId, userId } },
//         //             });
//         //         } else {
//         //             await prisma.commentLike.create({
//         //                 data: { commentId, userId },
//         //             });
//         //         }

//         //         const updatedComment = await prisma.comment.findUnique({
//         //             where: { id: commentId },
//         //             include: { likes: { include: { user: true } } },
//         //         });

//         //         io.to(`ticket:${data.ticketId}`).emit("update-comment", updatedComment);
//         //     });
//         // });
//     }

//     return server.io;
// }


// socket-server.ts








// import http from "http";
// import { Server } from "socket.io";


// const server = http.createServer();
// // const io = new Server(3001, {
// //     cors: { origin: "*" }, // allow your frontend to connect
// // });

// const io = new Server(server, {
//     cors: {
//         origin: "*", // React/Next app
//         methods: ["GET", "POST"],
//     },
// });

// server.listen(3001, "0.0.0.0", () => {
//     console.log("Socket server running on 0.0.0.0:3001");
// });

// io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);

//     socket.on("join-ticket", (ticketId: string) => {
//         socket.join(`ticket:${ticketId}`);
//         console.log(`Socket ${socket.id} joined ticket:${ticketId}`);
//     });



//     socket.on("typing", (data: { ticketId: string; userName: string }) => {
//         // console.log("Typing event received on server:", socket.id, data);
//         // broadcast to everyone else in the ticket room
//         socket.to(`ticket:${data.ticketId}`).emit("user-typing", data);

//     });

//     // New comment event
//     // socket.on("new-comment", (comment) => {
//     //     console.log("comment received on server:",);

//     //     io.to(`ticket:${comment.ticketId}`).emit("new-comment", comment);
//     // });

//     socket.on("send-comment", (comment) => {
//         console.log("comment received on server:", comment);

//         io.to(`ticket:${comment.ticketId}`).emit("new-comment", comment);
//     });


//     socket.on("disconnect", () => {
//         console.log("User disconnected:", socket.id);
//     });
// });

// console.log("⚡ Socket server running on port 3001");



// import { getTicketAuditLogs } from "@/app/helpdesk/tickets/action";
import { TicketFormData } from "@/app/helpdesk/tickets/ticket.schema";
import { Audit, Ticket } from "@/generated/prisma/client";
import { log } from "console";
import http from "http";
import { Server } from "socket.io";

const server = http.createServer();
const PORT = Number(process.env.PORT) || 3001;

const io = new Server(server, {
    cors: {
        origin: "*",
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


    // socket.on("update-ticket", async (data: { id: string; remark: string }) => {
    //     console.log("Ticket update received:", data);

    //     // Optionally update DB here if you still want server-side storage
    //     // await updateTicketInDB(data.id, data.remark);

    //     // Broadcast to all in the ticket room
    //     io.to(`ticket:${data.id}`).emit("ticket-updated", data);
    // });3
    // socket.on("update-ticket", (data: { id: string; audit: Audit, ticket: TicketFormData }) => {
    //     // io.to(`ticket:${data.id}`).emit("ticket-updated", data.audit);

    //     log("Ticket update received:", data);
    //     io.to(`ticket:${data.id}`).emit("ticket-updated", data.audit, data.ticket);

    // });


    socket.on("update-ticket", (data: { id: string; audit: Audit; ticket: TicketFormData }) => {
        // broadcast to the ticket room
        io.to(`ticket:${data.id}`).emit("ticket-updated", data.audit, data.ticket);
    });



});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`⚡ Socket server running on 0.0.0.0:${PORT}`);
});


