"use server";

import { prisma } from "@/libs/prisma";
import { Prisma } from "@prisma/client";
import { LogWithContact } from "./page";
import { z } from "zod";

 const logSchema = z.object({
  datetime: z.string().datetime(), // you can also use z.date() if you parse a Date object
  recoveryTime: z.string().datetime().nullable().optional(),
  status: z.enum(["PROBLEM", "RECOVERED"]),
  host: z.string().min(1, "Host cannot be empty"),
  description: z.string().nullable().optional(),
  problemSeverity: z.enum(["DISASTER", "HIGH", "AVERAGE", "WARNING", "INFORMATION"]),
  duration: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
});




export interface LogsResponse {
  data: LogWithContact[];
  total: number;
  nextPage?: number;
}

export async function getCounts() {

  const Critical = await prisma.logs.count({
    where: { problemSeverity: 'Critical' },
  });
  const Major = await prisma.logs.count({
    where: { problemSeverity: 'Major' },
  });
  const Minor = await prisma.logs.count({
    where: { problemSeverity: 'Minor' },
  });
  const Request = await prisma.logs.count({
    where: { problemSeverity: 'Request' },
  });

  return {
    Critical,
    Major,
    Minor,
    Request,
  };
}



export async function getLogs({
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
    data: logs,
    total,
    nextPage: page * limit < total ? page + 1 : undefined,
  };
}


export async function createLog() {
  // return await prisma.logs.create({  });

  console.log("Creating log...");
}

// export async function updateLog(data: any) {
//   return await prisma.logs.update({
//     where: { id: data.id },
//     data,
//   });
// }

// export async function deleteLog(id: string) {
//   return await prisma.logs.delete({ where: { id } });
// }
