import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ===== Users =====
  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {},
    create: {
      name: "Agent User",
      email: "agent@example.com",
      password: agentPassword,
      role: "AGENT",
    },
  });

  // ===== Departments =====
  const itDepartment = await prisma.department.upsert({
    where: { name: "IT Department" },
    update: {},
    create: {
      name: "IT Department",
      description: "Handles all IT related tasks",
      managerId: agent.id,
      creatorId: admin.id,
      updaterId: admin.id,
    },
  });

  // ===== Job Positions =====
  await prisma.jobPosition.upsert({
    where: { id: "position-001" },
    update: {},
    create: {
      name: "Developer",
      departmentId: itDepartment.id,
      creatorId: admin.id,
    },
  });

  // ===== Categories =====
  const softwareCategory = await prisma.category.upsert({
    where: { id: "cat-001" },
    update: {},
    create: {
      name: "Software",
      creatorId: admin.id,
    },
  });

  // ===== Tickets =====
  await prisma.ticket.upsert({
    where: { id: "ticket-001" },
    update: {},
    create: {
      ticketId: "TICKET-001",
      title: "Computer not working",
      description: "User cannot log in to computer",
      categoryId: softwareCategory.id,
      subcategoryId: softwareCategory.id, // same as category for simplicity
      departmentId: itDepartment.id,
      requesterId: admin.id,
      status: "OPEN",
      priority: "HIGH",
    },
  });

  console.log("✅ Essential seed data inserted!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
