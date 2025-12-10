"use server"


import { prisma } from "@/libs/prisma";
// src/app/helpdesk/category/action.ts
import { z } from "zod";

const CategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  departmentId: z.string().min(1, "Department is required"),
});

export async function getCategories() {
  const categories = await prisma.category.findMany({
    include: {
      department: {
        select: { name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    departmentId: c.departmentId,
    departmentName: c.department?.name || "",
  }));
}

export async function createCategory(data: { name: string; departmentId: string }) {
  const parsed = CategorySchema.parse(data);
  const category = await prisma.category.create({
    data: parsed,
  });
  return category;
}

export async function updateCategory(id: string, data: { name: string; departmentId: string }) {
  const parsed = CategorySchema.parse(data);
  const category = await prisma.category.update({
    where: { id },
    data: parsed,
  });
  return category;
}



export async function getCategoriesNames(): Promise<{ name: string, id: string , departmentId : string }[]> {
    const departments = await prisma.category.findMany({
        select: {
            name: true,
            id: true,
            departmentId: true
        },
    });
    return departments
}