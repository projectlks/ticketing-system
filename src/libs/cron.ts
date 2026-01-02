import cron from "node-cron";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import nodemailer from "nodemailer";

dotenv.config();
// Load .env first



// 🧹 Weekly cleanup job
cron.schedule(
    "0 17 * * 0", // Sunday 5 PM Myanmar Time
    async () => {
        try {
            console.log("[CRON] Deleting old tickets...");
            // await permanentDeleteTickets();

            console.log("[CRON] Deleting expired user sessions...");
            // await prisma.userSession.deleteMany({
            //     where: { expiresAt: { lt: new Date() } },
            // });

            console.log("[CRON] Cleanup done.");
        } catch (err) {
            console.error("[CRON] Cleanup failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);

// ✉ Helper: Send detailed SLA violation email
async function sendSlaViolationMail({
    ticket,
}: {
    ticket: {
        ticketId: string;
        title: string;
        description: string;
        requester: { name: string; email: string } | null;
        assignedTo?: { name: string; email: string } | null;
        department?: { name: string; } | null;
        priority?: string;
        status?: string;
        resolutionDue?: Date;
    };
}) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASS,
        },
    });

    const recipients = new Set<string>();
    if (ticket.requester?.email) recipients.add(ticket.requester.email);
    if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);
    // if (ticket.department?.manager?.email) recipients.add(ticket.department.manager.email);

    // Include admins/supports
    // const supportUsers = await prisma.user.findMany({
    //     where: { role: { in: ["SUPER_ADMIN"] } },
    //     select: { email: true },
    // });
    // supportUsers.forEach((u) => recipients.add(u.email));

    const mailOptions = {
        from: `"Ticketing System" <${process.env.EMAIL_SERVER_USER}>`,
        to: Array.from(recipients),
        subject: `⚠ SLA Violated: Ticket #${ticket.ticketId}`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
        <h2 style="color: #d9534f;">⚠ SLA Violation Alert</h2>
        <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
        <p><strong>Title:</strong> ${ticket.title}</p>
        <p><strong>Description:</strong> ${ticket.description}</p>
        <p><strong>Requester:</strong> ${ticket.requester?.name ?? "N/A"}</p>
        <p><strong>Assigned To:</strong> ${ticket.assignedTo?.name ?? "N/A"}</p>
        <p><strong>Department:</strong> ${ticket.department?.name ?? "N/A"}</p>
        <p><strong>Priority:</strong> ${ticket.priority ?? "N/A"}</p>
        <p><strong>Status:</strong> ${ticket.status ?? "N/A"}</p>
        <p><strong>Resolution Due:</strong> ${ticket.resolutionDue?.toLocaleString() ?? "N/A"}</p>
        <p style="color: #c9302c;">The SLA time for this ticket has been exceeded. Immediate attention is required.</p>
        <a href="https://support.eastwindmyanmar.com.mm" style="color:#2c7a7b;">Go to Ticketing System</a>


        <p> this is a test</p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent detailed SLA alert to ${Array.from(recipients).join(", ")}`);
    } catch (error) {
        console.error("[MAIL ERROR]", error);
    }
}

// 🕒 SLA checking job (every 10 minutes)
cron.schedule(
    "*/1 * * * *",
    async () => {
        try {
            const now = new Date();


            const violatedTickets = await prisma.ticket.findMany({
                where: {
                    status: {
                        notIn: ["RESOLVED", "CLOSED", "CANCELED"

                        ]
                    },
                    resolutionDue: { lt: now },
                    isSlaViolated: false,
                },
                include: {
                    department: true,
                    requester: true,
                    assignedTo: true,
                },
            });

            for (const ticket of violatedTickets) {
                // Update SLA violation flag
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { isSlaViolated: true },
                });

                console.log(`SLA violated → Ticket: ${ticket.ticketId}`);

                // Map department to safe shape
                // const department = ticket.department
                //     ? {
                //         name: ticket.department.name,

                //     }
                //     : null;

                // // Send detailed SLA email
                // await sendSlaViolationMail({
                //     ticket: {
                //         ticketId: ticket.ticketId,
                //         title: ticket.title,
                //         description: ticket.description,
                //         requester: ticket.requester
                //             ? { name: ticket.requester.name, email: ticket.requester.email }
                //             : null,
                //         assignedTo: ticket.assignedTo
                //             ? { name: ticket.assignedTo.name, email: ticket.assignedTo.email }
                //             : null,
                //         department,
                //         priority: ticket.priority ?? undefined,
                //         status: ticket.status,
                //         resolutionDue: ticket.resolutionDue ?? undefined,
                //     },
                // });
            }

            console.log(`[CRON] Checked ${violatedTickets.length} tickets.`);
        } catch (err) {
            console.error("[CRON] SLA check failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);






dotenv.config(); // <-- load .env

const BASE_URL = process.env.BASE_URL;








cron.schedule("*/1 * * * *", async () => {

    if (!BASE_URL) {
        console.error("❌ BASE_URL is not defined");
        return;
    }

    console.log("⏳ Running Zabbix fetch...");

    try {
        const res = await fetch(`${BASE_URL}/api/problems?from=cron`);
        const data = await res.json();

        console.log("✅ Cron success:", data);
    } catch (err) {
        console.error("❌ Cron fetch error:", err);
    }
});
