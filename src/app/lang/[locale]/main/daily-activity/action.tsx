"use server";

import { prisma } from "@/libs/prisma";
import { Prisma } from "@prisma/client";
import { LogWithContact } from "./page";
import { z } from "zod";
import { getCurrentUser } from "../tickets/action";
import { error } from "console";
// import { AuditChange } from "@/libs/action";
// import { Severity } from '@prisma/client'; // ✅ Import your enum



const logSchema = z.object({
  status: z.enum(["PROBLEM", "RESOLVED"]),
  host: z.string().min(1, "Host cannot be empty"),
  description: z.string().nullable().optional(),
  problemSeverity: z.enum(["DISASTER", "HIGH", "AVERAGE", "WARNING", "INFORMATION"]),
    // role: z.enum(["REQUESTER", "AGENT", "ADMIN", "SUPER_ADMIN"]),

  duration: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
});




export interface LogsResponse {
  data: LogWithContact[];
  total: number;
  nextPage?: number;
}

export async function getCounts() {

  const INFORMATION = await prisma.logs.count({
    where: { problemSeverity: 'INFORMATION' },
  });
  const WARNING = await prisma.logs.count({
    where: { problemSeverity: 'WARNING' },
  });
  const AVERAGE = await prisma.logs.count({
    where: { problemSeverity: 'AVERAGE' },
  });
  const HIGH = await prisma.logs.count({
    where: { problemSeverity: 'HIGH' },
  });
  const DISASTER = await prisma.logs.count({
    where: { problemSeverity: 'DISASTER' },
  });

  return {
    INFORMATION,
    WARNING,
    AVERAGE,
    HIGH,
    DISASTER
  };
}



export async function getAllLogs({
  page = 1,
  search = "",
}: {
  page?: number;
  search?: string;
}): Promise<LogsResponse> {  // ✅ Correct type
  const limit = 10;

  const where = search
    ? {
      OR: [
        { host: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { status: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    }
    : {};

  const total = await prisma.logs.count({ where });

  const logs: LogWithContact[] = await prisma.logs.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { datetime: "desc" },
    include: { contact: { select: { name: true, email: true, id: true } } },
  });

  return {
    data: logs || [],
    total,
    nextPage: page * limit < total ? page + 1 : undefined,
  };
}

export async function getLogById(id: string): Promise<LogWithContact | null> {
  const log = await prisma.logs.findUnique({
    where: { id },
    include: { contact: { select: { name: true, email: true, id: true } } },
  });
  return log;
}


export async function createLog(formData: FormData) {
  const currentuser = await getCurrentUser();
  if (!currentuser) return error("Unauthenticated");

  // ✅ Convert FormData → Object
  const rawData = Object.fromEntries(formData.entries());

  // ✅ Validate data with Zod
  const parsedData = logSchema.parse(rawData);


  // const serv = prisma.se
  // const serv = prisma.Severity
  // const severityEnum = parsedData.problemSeverity as Severity;

  // ✅ Save to Prisma
  const log = await prisma.logs.create({
    data: {
      datetime: new Date(),
      host: parsedData.host,
      description: parsedData.description,
      status: parsedData.status,
      problemSeverity: parsedData.problemSeverity,
      contactId: currentuser.id, // if you store relation
      remark: parsedData.remark,
      duration: parsedData.duration,
    },
  });

  return log;
}

// export async function updateLog(id: string, formData: FormData) {
//   const currentuser = await getCurrentUser();
//   if (!currentuser) return error("Unauthenticated");

//   // ✅ Convert FormData → Object
//   const rawData = Object.fromEntries(formData.entries());

//   // ✅ Validate data with Zod
//   const parsedData = logSchema.parse(rawData);


//       // Fetch current department before update
//       const current = await prisma.logs.findUniqueOrThrow({ where: { id } });
  
//       // Build audit change list
//       const changes: AuditChange[] = Object.entries(parsedData).flatMap(([field, newVal]) => {
//         const oldVal = (current as Record<string, unknown>)[field];
//         if (oldVal?.toString() !== newVal.toString()) {
//           return [{
//             field,
//             oldValue: oldVal?.toString() ?? "",
//             newValue: newVal?.toString() ?? "",
//           }];
//         }
//         return [];
//       });


//         // Save audit logs if there are changes
//     if (changes.length > 0) {
//       await prisma.audit.createMany({
//         data: changes.map(c => ({
//           entity: "Department",
//           entityId: id,
//           field: c.field,
//           oldValue: c.oldValue,
//           newValue: c.newValue,
//           userId: currentuser.id,
//         })),
//       });
//     }

//   // ✅ Save to Prisma
//   const log = await prisma.logs.update({
//     where: { id },
//     data: {
//       datetime: new Date(),
//       host: parsedData.host,
//       description: parsedData.description,
//       status: parsedData.status,
//       problemSeverity: parsedData.problemSeverity,
//       contactId: currentuser.id, // if you store relation
//       remark: parsedData.remark,
//       duration: parsedData.duration,
//     },
//   });

//   return log;
// }

export async function updateLog(id: string, formData: FormData) {
  const currentuser = await getCurrentUser();
  if (!currentuser) throw new Error("Unauthenticated");

  // Convert form data
  const rawData = Object.fromEntries(formData.entries());
  
  // Parse & type cast
  const parsedData = logSchema.parse({
    ...rawData,
    duration: Number(rawData.duration),
    problemSeverity: Number(rawData.problemSeverity),
  });

  // Fetch current log
  const current = await prisma.logs.findUniqueOrThrow({ where: { id } });

  // Compute changes
  const changes = Object.entries(parsedData).flatMap(([field, newVal]) => {
    const oldVal = (current as Record<string, unknown>)[field];
    if ((oldVal ?? "").toString() !== (newVal ?? "").toString()) {
      return [{
        field,
        oldValue: (oldVal ?? "").toString(),
        newValue: (newVal ?? "").toString(),
      }];
    }
    return [];
  });

  // Save audit logs
  if (changes.length > 0) {
    await prisma.audit.createMany({
      data: changes.map(c => ({
        entity: "Log",
        entityId: id,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        userId: currentuser.id,
      })),
    });
  }

  // Update log record
  const log = await prisma.logs.update({
    where: { id },
    data: {
      datetime: new Date(),
      host: parsedData.host,
      description: parsedData.description,
      status: parsedData.status,
      problemSeverity: parsedData.problemSeverity,
      contactId: currentuser.id,
      remark: parsedData.remark,
      duration: parsedData.duration,
    },
  });

  return log;
}
