import { prisma } from "../src/libs/prisma";
import bcrypt from "bcrypt";

async function main() {
  // ===== Create default Department =====
  const department = await prisma.department.upsert({
    where: { name: "EWM" },
    update: {},
    create: {
      name: "EWM",
      description: "East Wind Myanmar Department",
      email: "support@eastwindmyanmar.com.mm",
    },
  });

  // ===== Users =====
  const adminPassword = await bcrypt.hash("QwertyuioP@123!@#", 10);

  await prisma.user.upsert({
    where: { email: "support@eastwindmyanmar.com.mm" },
    update: {
      role: "SUPER_ADMIN",
      isArchived: false,
      departmentId: department.id,
    },
    create: {
      name: "Super Admin",
      email: "support@eastwindmyanmar.com.mm",
      password: adminPassword,
      role: "SUPER_ADMIN",
      departmentId: department.id,
    },
  });

  // ===== SLA =====
  await prisma.sLA.createMany({
    data: [
      {
        priority: "CRITICAL",
        responseTime: 30,
        resolutionTime: 120,
        rcaTime: 7,
        availability: "7*24",
      },
      {
        priority: "MAJOR",
        responseTime: 120,
        resolutionTime: 240,
        rcaTime: 10,
        availability: "7*24",
      },
      {
        priority: "MINOR",
        responseTime: 240,
        resolutionTime: 1440,
        rcaTime: 10,
        availability: "7*24",
      },
      {
        priority: "REQUEST",
        responseTime: 480,
        resolutionTime: 43200,
        availability: "5*8",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed data inserted successfully!");
}

main()
  .catch((error) => console.error(error))
  .finally(async () => {
    await prisma.$disconnect();
  });
