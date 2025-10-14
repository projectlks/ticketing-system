
"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getCurrentUserId } from "@/libs/action";
import { AuditChange } from "@/libs/action";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma, Status } from "@prisma/client";
import { TicketWithRelations } from "./page";


import dayjs from 'dayjs';
// import { CommentWithRelations } from "./view/[id]/TicketView";

import fs from "fs/promises";
import path from "path";


const TicketSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  description: z.string().min(1, "Title cannot be empty"),
  categoryId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL",]).nullable().optional(),
});

const CommentSchema = z.object({
  content: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  ticketId: z.string(),
  parentId: z.string().nullable().optional(),
});


async function generateTicketId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear(); // 2025
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 08

  // ယခုလအတွင်းရှိ ticket အရေအတွက် ရှာမယ် (year + month တူတဲ့ ticket များ)
  const count = await prisma.ticket.count({
    where: {
      createdAt: {
        gte: new Date(year, now.getMonth(), 1), // ဒီလ ၁ ရက် ၀းစ
        lt: new Date(year, now.getMonth() + 1, 1), // နောက်လ ၁ ရက် ၀းစ (exclusive)
      },
    },
  });

  // count က ယခင် ticket အရေအတွက်ဖြစ်ပြီး၊ ဒီ ticket အတွက် ၁ ပေါင်းမယ်
  const ticketNumber = (count + 1).toString().padStart(3, '0'); // 001, 002, ...

  const ticketId = `REQ-${year}-${month}-${ticketNumber}`;
  return ticketId;
}

// test mail sending

import nodemailer from "nodemailer";
import { getMailSetting } from "../mail-setting/action";
import { createTicketHtml, updateTicketHtml } from "@/libs/action";

export async function sendTicketMail({
  ticketId,
  title,
  description,
  requester,
  to,
  subject,
  html
}: {
  ticketId: string;
  title: string;
  description: string;
  requester: string;
  to: string[] | string;
  subject?: string;
  html?: string;
}) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASS,
    },
  });


  const mailOptions = {
    from: `"Ticketing System" <${process.env.EMAIL_SERVER_USER}>`,



    to: to,



    subject: subject ? subject : `🆕 New Ticket Created: #${ticketId}`,

    html: html ?? `
      <div style="font-family: Arial; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2c7a7b;">New Ticket</h2>
        <p><strong>Ticket ID:</strong> ${ticketId}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Requester:</strong> ${requester}</p>
        <p style="color: #2f855a;">Please check the ticketing system for more details.</p>
        <a href="https://support.eastwindmyanmar.com.mm">Go to Ticketing System</a>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: "Mail sent successfully" };
  } catch (error) {
    console.error("Mail send error:", error);
    return { success: false, message: "Failed to send mail" };
  }
}

// Create Ticket


export async function createTicket(
  formData: FormData
): Promise<{ success: boolean; data: TicketWithRelations }> {
  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    departmentId: formData.get("departmentId"),
    categoryId: formData.get("categoryId"),

  };

  // Parse images from JSON string
  const imagesJson = formData.get("images") as string | null;
  const images = imagesJson ? JSON.parse(imagesJson) as string[] : [];



  const data = TicketSchema.parse(raw);
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("No logged-in user found");

  const ticketId = await generateTicketId();

  const ticket = await prisma.ticket.create({
    data: {

      title: data.title,
      description: data.description,
      // priority: data.priority,
      ticketId,
      createdAt: new Date(),
      updatedAt: new Date(),
      requesterId: currentUserId,
    },
  });

  // Insert ticket images
  if (images.length) {
    await prisma.ticketImage.createMany({
      data: images.map((url) => ({
        ticketId: ticket.id,
        url,
      })),
    });
  }

  const createdData = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
      images: true,
      views: true, // ✅ DB မှာ array
    },
  });

  if (!createdData) throw new Error("Ticket creation failed");

  // map views array → viewed boolean
  const ticketWithViewed: TicketWithRelations = {
    ...createdData,
    viewed: createdData.views.some(v => v.userId === currentUserId), // creator ရှိမရှိစစ်
  };
  const mailRecipients = await getMailSetting();


  // ✅ Send Mail to fixed email
  try {
    // await sendTicketMail({
    //   ticketId: ticketWithViewed.ticketId,
    //   requester: createdData.requester?.email || "No Requester Email",
    //   title: ticketWithViewed.title,
    //   description: ticketWithViewed.description,
    //   to: mailRecipients,
    // });


    // Example: after creating a ticket
    await sendTicketMail({
      ticketId: ticket.ticketId,
      title: ticket.title,
      description: ticket.description,
      requester: createdData.requester?.email || "No Requester Email",
      to: mailRecipients,
      subject: `🆕 New Ticket Created: #${ticket.ticketId}`,
      html: await createTicketHtml({
        ticketId: ticket.ticketId,
        title: ticket.title,
        description: ticket.description,
        requester: createdData.requester?.email || "No Requester Email",
      }),
    });



    console.log("Ticket email sent to mglinkar08@gmail.com");
  } catch (err) {
    console.error("Failed to send ticket email:", err);
  }

  return { success: true, data: ticketWithViewed };
}

// Get Single Ticket
export async function getTicket(id: string) {


  // await prisma.TicketImage


  return await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      images: true, // <-- fetches all related images
    },
  });
}





export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) return null;

  // Fetch user with role and id from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, email: true, name: true, departmentId: true },
  });

  return user;
}
export async function getAllTickets(
  page = 1,
  searchQuery = "",
  filters: { key: string; value: string }[] = [],
  viewedFilter?: "SEEN" | "UNSEEN"
) {
  const take = 10;
  const skip = (page - 1) * take;
  const trimmedQuery = searchQuery.trim();

  const prismaFilters: Prisma.TicketWhereInput = {};

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Apply filters (status, priority, assigned)
  filters.forEach(f => {
    if (f.key === "Assigned") {
      prismaFilters.assignedToId = f.value === "Assigned" ? { not: null } : null;
    } else if (f.key === "Status") {
      const statusMap: Record<string, Prisma.TicketWhereInput["status"]> = {
        Open: "OPEN",
        "In Progress": "IN_PROGRESS",
        Resolved: "RESOLVED",
        Closed: "CLOSED",
      };
      prismaFilters.status = statusMap[f.value] || undefined;
    } else if (f.key === "Priority") {
      const priorityMap: Record<string, Prisma.TicketWhereInput["priority"]> = {
        REQUEST: "REQUEST",
        MINOR: "MINOR",
        MAJOR: "MAJOR",
        CRITICAL: "CRITICAL",
      };
      prismaFilters.priority = priorityMap[f.value] || undefined;
    }
  });

  // Role-based filters
  if (user.role === "REQUESTER") {
    // prismaFilters.requesterId = user.id 
    // prismaFilters.departmentId = user.departmentId || undefined;

    prismaFilters.OR = [
      { requesterId: user.id },
      { departmentId: user.departmentId || undefined },
    ];

  } else if (user.role === "AGENT") {
    // prismaFilters.assignedToId = user.id;
    // prismaFilters.departmentId = user.departmentId || undefined;

    prismaFilters.OR = [
      { requesterId: user.id },
      { departmentId: user.departmentId || undefined },
    ];


  }

  // Seen/Unseen filter
  if (viewedFilter === "SEEN") prismaFilters.views = { some: { userId: user.id } };
  if (viewedFilter === "UNSEEN") prismaFilters.views = { none: { userId: user.id } };

  // Final where condition
  const where: Prisma.TicketWhereInput = {
    ...prismaFilters,
    ...(user.role !== "SUPER_ADMIN" && { isArchived: false }), // 👈 Only non-SUPER_ADMIN get this
    ...(trimmedQuery && {
      OR: [
        { title: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
        { ticketId: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
  };

  // Count & fetch tickets
  const total = await prisma.ticket.count({ where });
  const rawData = await prisma.ticket.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      views: true,
    },
  });

  // Mark viewed for current user
  const data = rawData.map(ticket => ({
    ...ticket,
    viewed: ticket.views.some(v => v.userId === user.id),
  }));




  return { data, total };
}



export async function updateTicket(
  formData: FormData,
  id: string
): Promise<{ success: boolean; data: TicketWithRelations }> {
  // 1. ticket အချက်အလက်တွေကို parse လုပ်မယ်
  const updateDataRaw = {
    title: formData.get("title"),
    description: formData.get("description"),
    departmentId: formData.get("departmentId") || null,
    categoryId: formData.get("categoryId") || null,
    priority: formData.get("priority") as string | null || null,
  };
  const updateData = TicketSchema.parse(updateDataRaw);


  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  // 2. ရှိပြီးသား ticket data ကို database မှာရှာမယ်
  const current = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  // 3. ပြောင်းလဲမှုတွေကို audit log အတွက် စစ်မယ်
  const changes: AuditChange[] = Object.entries(updateData).flatMap(([field, newVal]) => {
    const oldVal = (current as Record<string, unknown>)[field];
    if (oldVal?.toString() !== newVal?.toString()) {
      return [{
        field,
        oldValue: oldVal?.toString() ?? "",
        newValue: newVal?.toString() ?? "",
      }];
    }
    return [];
  });

  // 4. formData ထဲက images ကို parse လုပ်မယ်  
  // formData.get("existingImageIds") မှာ ကျန်ရှိနေတဲ့ image တွေရဲ့ id တွေ JSON string အဖြစ် ရှိတယ်လို့ယူထားတယ်
  const existingImageIds = JSON.parse(formData.get("existingImageIds") as string || "[]") as string[];

  // formData.get("newImages") မှာ အသစ် upload လုပ်ထားတဲ့ images URL တွေ JSON string အဖြစ် ရှိတယ်လို့ယူထားတယ်
  const newImageUrls = JSON.parse(formData.get("newImages") as string || "[]") as string[];

  // 5. DB ထဲက ticketImage table မှာ အခု ticket နဲ့ ဆက်နွယ်ပြီး ကျန်ရှိတဲ့ image id တွေကို ရှာထုတ်မယ်
  const imagesInDb = await prisma.ticketImage.findMany({
    where: { ticketId: id },
    select: { id: true },
  });
  const imagesInDbIds = imagesInDb.map(img => img.id);

  // 6. existingImageIds ထဲ မပါတဲ့ DB ရဲ့ image ids ကို filter လုပ်ပြီး ဖျက်ရန် id များကို ရှာမယ်
  const idsToDelete = imagesInDbIds.filter(dbId => !existingImageIds.includes(dbId));

  if (idsToDelete.length > 0) {
    await prisma.ticketImage.deleteMany({
      where: {
        id: { in: idsToDelete },
      }
    });
  }

  // 7. အသစ် upload လုပ်ထားတဲ့ images URL တွေကို ticketImage table ထဲသို့ထည့်မယ်
  if (newImageUrls.length) {
    const newImagesData = newImageUrls.map(url => ({ ticketId: id, url }));
    await prisma.ticketImage.createMany({ data: newImagesData });
  }

  // 8. ticket အချက်အလက်တွေကို update လုပ်မယ်
  await prisma.ticket.update({
    where: { id },
    data: {
      ...updateData, updatedAt: new Date(), priority: updateData.priority || null


    },


  });
  // sla and change status

  if (current.status === Status.NEW && updateData.departmentId && updateData.categoryId && updateData.priority) {

    const priority = updateData.priority


    const sla = await prisma.sLA.findUnique({
      where: { priority },
    });

    if (!sla) throw new Error(`No SLA found for priority: ${priority}`);

    // 2. အချိန်တွေတွက်မယ်
    const now = new Date();
    const responseDue = dayjs(now).add(sla.responseTime, 'minute').toDate();
    const resolutionDue = dayjs(now).add(sla.resolutionTime, 'minute').toDate();




    await prisma.ticket.update({
      where: { id },
      data: {
        slaId: sla.id,
        startSlaTime: now,
        responseDue,
        resolutionDue,
        // status: Status.OPEN
        status: current.status === Status.NEW ? Status.OPEN : current.status
        // 

      },


    });
  }


  // 9. audit log ကို ထည့်သွင်းမယ်
  if (changes.length) {
    await prisma.audit.createMany({
      data: changes.map((c) => ({
        entity: "Ticket",
        entityId: id,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        userId: updaterId,
      })),
    });
  }

  // 10. update ပြီးတဲ့ ticket ကို relations တွေနဲ့ ပြန်ရှာပြီး return ပြန်မယ်
  const updatedTicketRaw = await prisma.ticket.findFirst({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
      images: true,
      views: true,
    },
  });


  // 11 . update your departmentId

  if (current.departmentId !== updateData.departmentId) {
    try {
      // Find updated ticket info for email content
      const updatedTicketInfo = await prisma.ticket.findUnique({
        where: { id },
        include: {
          requester: { select: { name: true, email: true } },
          department: {
            select: {
              name: true,
              email: true,
              manager: { select: { name: true, email: true } },
            },
          },
        },
      });

      // find all people in this deaprtment
      const departmentMembers = await prisma.user.findMany({
        where: { departmentId: updateData.departmentId },
        select: { name: true, email: true },
      });

      if (updatedTicketInfo) {

        const recipientsSet = new Set<string>();

        if (updatedTicketInfo.department?.email) recipientsSet.add(updatedTicketInfo.department.email);
        if (updatedTicketInfo.department?.manager?.email) recipientsSet.add(updatedTicketInfo.department.manager.email);

        departmentMembers.forEach(member => {
          if (member.email) recipientsSet.add(member.email);
        });

        const recipients = Array.from(recipientsSet);


        if (recipients.length > 0) {          // Example: after updating a ticket
          await sendTicketMail({
            ticketId: updatedTicketInfo.ticketId,
            title: updatedTicketInfo.title,
            description: updatedTicketInfo.description,
            requester: updatedTicketInfo.requester?.email || "No Requester Email",
            to: recipients,
            subject: `🔄 Ticket Updated: #${updatedTicketInfo.ticketId}`,
            html: await updateTicketHtml({
              ticketId: updatedTicketInfo.ticketId,
              title: updatedTicketInfo.title,
              description: updatedTicketInfo.description,
              requester: updatedTicketInfo.requester?.email || "No Requester Email",
              updater: `${updatedTicketInfo.requester?.name} (${updatedTicketInfo.requester?.email})`,
              oldDepartment: current?.departmentId ? (await prisma.department.findUnique({ where: { id: current.departmentId } }))?.name : "None",
              newDepartment: updatedTicketInfo.department?.name,
              updatedFields: changes.map(c => c.field),
            }),
          });


          console.log("✅ Department change email sent to:", recipients);
        } else {
          console.warn("⚠️ No valid department or manager email found for ticket:", id);
        }
      }
    } catch (err) {
      console.error("⚠️ Failed to send department change email:", err);
    }
  }




  if (!updatedTicketRaw) {
    throw new Error('Ticket not found after update');
  }

  // map views array → viewed boolean
  const updatedTicket: TicketWithRelations = {
    ...updatedTicketRaw,
    viewed: updatedTicketRaw.views.some(v => v.userId === updaterId),
  };

  return { success: true, data: updatedTicket };
}




export async function permanentDeleteTickets() {


  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const ticketsToDelete = await prisma.ticket.findMany({
    where: {
      isArchived: true,
      updatedAt: { lt: threeMonthsAgo },
    },
    include: {
      images: true,   // TicketImage
      comments: { include: { likes: true } }, // Comment + CommentLike
      views: true,
    },
  });

  if (ticketsToDelete.length === 0) return;

  const idsToDelete = ticketsToDelete.map(t => t.id);

  // =====================
  // Step 0: Delete files from uploads folder
  // =====================
  for (const ticket of ticketsToDelete) {
    if (ticket.images.length > 0) {
      await Promise.all(ticket.images.map(async (img) => {
        const safeName = path.basename(img.url);
        const filePath = path.join(process.cwd(), "uploads", safeName);
        try {
          await fs.unlink(filePath);
          console.log(`Deleted file: ${img.url}`);
        } catch (err) {
          if (err instanceof Error) {
            console.log(`Failed to delete file ${img.url}:`, err.message);
          } else {
            console.log(`Failed to delete file ${img.url}:`, String(err));
          }
        }
      }));
    }
  }

  // =====================
  // Step 1: Delete related tables
  // =====================
  await prisma.commentLike.deleteMany({
    where: { comment: { ticketId: { in: idsToDelete } } },
  });


  // Step X: Delete comment images from filesystem
  const commentsWithImages = await prisma.comment.findMany({
    where: { ticketId: { in: idsToDelete }, NOT: { imageUrl: null } },
    select: { imageUrl: true },
  });

  for (const c of commentsWithImages) {
    if (c.imageUrl) {
      const safeName = path.basename(c.imageUrl);
      const filePath = path.join(process.cwd(), "uploads", safeName);
      try {
        await fs.unlink(filePath);
        console.log(`Deleted comment image: ${c.imageUrl}`);
      } catch (err) {
        if (err instanceof Error) {
          console.log(`Failed to delete comment image ${c.imageUrl}:`, err.message);
        } else {
          console.log(`Failed to delete comment image ${c.imageUrl}:`, String(err));
        }
      }
    }
  }

  // Then delete the comments themselves
  await prisma.comment.deleteMany({
    where: { ticketId: { in: idsToDelete } },
  });


  // await prisma.comment.deleteMany({
  //   where: { ticketId: { in: idsToDelete } },
  // });

  await prisma.ticketImage.deleteMany({
    where: { ticketId: { in: idsToDelete } },
  });

  await prisma.ticketView.deleteMany({
    where: { ticketId: { in: idsToDelete } },
  });

  // =====================
  // Step 2: Delete tickets
  // =====================
  await prisma.ticket.deleteMany({
    where: { id: { in: idsToDelete } },
  });

  console.log(`[CRON] Deleted ${idsToDelete.length} tickets older than 3 months`);

}




// Delete Ticket (soft delete example)
export async function deleteTicket(id: string) {

  return await prisma.ticket.update({
    where: { id },
    data: {
      isArchived: true, // add this boolean to your Ticket model if not present
      updatedAt: new Date(),
      // updaterId: session?.user?.id, // if you add updater relation
    },
  });
}


export async function permanentDeleteTicket(id: string) {
  await prisma.ticket.delete({
    where: {
      id: id,
    },
  });
}

// Get audit logs for a ticket
export async function getTicketAuditLogs(ticketId: string) {
  return await prisma.audit.findMany({
    where: {
      entity: "Ticket",
      entityId: ticketId,
    },
    orderBy: { changedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
}



// lib/tickets.ts

export async function getTicketDetail(id: string) {
  return await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      ticketId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      assignedToId: true,
      category: {
        select: { id: true, name: true },
      },
      // subcategory: {
      //   select: { id: true, name: true },

      // },
      department: {
        select: { id: true, name: true },
      },
      requester: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      images: {
        select: { id: true, url: true },
      },
    },
  });
}



export async function ticketAssign(
  ticketId: string,
  assignedToId: string | null
): Promise<void> {
  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  // ရှိပြီးသား ticket data ကို ရှာမယ်
  const currentTicket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },

      },


      requester: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

    },
  });


  // ပြောင်းလဲမှုရှိမရှိ စစ်မယ်
  const oldAssignedTo = currentTicket.assignedTo;
  if (oldAssignedTo?.id === assignedToId) {
    // ပြောင်းမှုမရှိရင် update လုပ်စရာမလို
    return;
  }

  // Update ticket assignedToId
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: assignedToId,
      status: "IN_PROGRESS",  // assign လုပ်တိုင်း status ပြောင်းချင်ရင်
      updatedAt: new Date(),
    },
  });

  // အသစ် assignedTo info ရှာဖို့
  const newAssignedTo = assignedToId
    ? await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { name: true, email: true },
    })
    : null;

  // oldValue, newValue ကို "name (email)" format ပြောင်း
  const oldValue = oldAssignedTo
    ? `${oldAssignedTo.name} ( ${oldAssignedTo.email} )`
    : "";

  const newValue = newAssignedTo
    ? `${newAssignedTo.name} (${newAssignedTo.email} )`
    : "";


  // ✅ Send email to new assignee if exists
  if (newAssignedTo?.email) {
    await sendTicketMail({
      ticketId: currentTicket.ticketId,
      title: currentTicket.title,
      description: currentTicket.description,
      requester: currentTicket.requester?.email || "No Requester Email",
      to: [newAssignedTo.email],
      subject: `🎯 Ticket Assigned: #${currentTicket.ticketId} - ${currentTicket.title}`,

    });
  }

  // Audit log ထည့်မယ်
  await prisma.audit.create({
    data: {
      entity: "Ticket",
      entityId: ticketId,
      field: "assignedToId",
      oldValue,
      newValue,
      userId: updaterId,
      changedAt: new Date(),
    },
  });
}


export async function uploadComment(input: {
  content?: string | null;
  imageUrl?: string | null;
  ticketId: string;
  parentId?: string
}): Promise<{ success: boolean; data: CommentWithRelations }> {
  const { content, imageUrl, ticketId, parentId } = CommentSchema.parse(input);

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("No logged-in user found");

  const comment = await prisma.comment.create({
    data: {
      content: content || "",
      imageUrl: imageUrl || "",
      ticketId,
      parentId: parentId || null,
      commenterId: currentUserId,
    },
    include: {
      commenter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      replies: true
    },
  });

  return {
    success: true,
    data: comment,
  };
}



export type CommentWithRelations = Prisma.CommentGetPayload<{
  include: {
    commenter: {
      select: { id: true; name: true; email: true }
    };
    replies: true;
  };
}>;

export async function getCommentWithTicketId(ticketId: string): Promise<CommentWithRelations[]> {
  // Get all comments for the ticket including commenter and likes
  const allComments = await prisma.comment.findMany({
    where: { ticketId },
    include: {
      commenter: { select: { id: true, name: true, email: true } },
      likes: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } }, // include users who liked
    },
    orderBy: { createdAt: "desc" },
  });

  // Group comments by parentId for quick lookup
  const commentMap = new Map<string | null, CommentWithRelations[]>();
  for (const comment of allComments) {
    const parentList = commentMap.get(comment.parentId ?? null) || [];
    parentList.push({ ...comment, replies: [] });
    commentMap.set(comment.parentId ?? null, parentList);
  }

  // Recursively attach replies
  function attachReplies(parentId: string | null): CommentWithRelations[] {
    return (commentMap.get(parentId) || []).map(comment => ({
      ...comment,
      replies: attachReplies(comment.id),
    }));
  }

  // Return only top-level comments with nested replies
  return attachReplies(null);
}

// action.ts
interface LikeCommentParams {
  commentId: string;
}

export async function likeComment({ commentId }: LikeCommentParams) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const existingLike = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });

  if (existingLike) {
    await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId } } });
    return { liked: false };
  } else {
    await prisma.commentLike.create({ data: { commentId, userId } });
    return { liked: true };
  }
}

export async function ticketStatusUpdate(
  ticketId: string,
  newStatus: Status // ✅ type-safe enum
): Promise<void> {
  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  // Fetch current ticket
  const currentTicket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    select: {
      status: true,
    },
  });

  // Skip if no change
  if (currentTicket.status === newStatus) {
    return;
  }

  // Update status
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: newStatus, // ✅ enum-safe
      updatedAt: new Date(),
    },
  });

  // Audit log
  await prisma.audit.create({
    data: {
      entity: "Ticket",
      entityId: ticketId,
      field: "status",
      oldValue: currentTicket.status,
      newValue: newStatus,
      userId: updaterId,
      changedAt: new Date(),
    },
  });
}



export async function markTicketAsViewed(ticketId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.ticketView.upsert({
    where: {
      ticketId_userId: {
        ticketId,
        userId: user.id,
      },
    },
    update: {}, // already viewed => nothing to update
    create: {
      ticketId,
      userId: user.id,
    },
  });
}



export async function restoreTickets(id: string) {
  // const session = await getServerSession(authOptions);

  return await prisma.ticket.update({
    where: { id },
    data: {
      isArchived: false,
      // updaterId: session?.user?.id,
    },
  });
}

