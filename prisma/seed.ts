import { prisma } from "@/libs/prisma";
import bcrypt from "bcrypt";


async function main() {
  // ===== Create default Department =====
  const department = await prisma.department.upsert({
    where: { name: "IT" },
    update: {},
    create: {
      name: "IT",
    },
  });

  // ===== Users =====
  const adminPassword = await bcrypt.hash("QwertyuioP@123!@#", 10);

  await prisma.user.upsert({
    where: { email: "support@eastwindmyanmar.com.mm" },
    update: {},
    create: {
      name: "Super Admin",
      email: "support@eastwindmyanmar.com.mm",
      password: adminPassword,
      role: "SUPER_ADMIN",
      departmentId: department.id, // ✅ assign department
    },
  });

  // ===== Mail Setting =====
  const existing = await prisma.mailSetting.findFirst();
  if (!existing) {
    await prisma.mailSetting.create({
      data: {
        emails: ["support@eastwindmyanmar.com.mm"],
      },
    });
    console.log("✅ MailSetting seeded successfully");
  } else {
    console.log("ℹ️ MailSetting already exists, skipping seeding");
  }

  // ===== SLA =====
  await prisma.sLA.createMany({
    data: [
      { priority: "CRITICAL", responseTime: 30, resolutionTime: 120, rcaTime: 7, availability: "7*24" },
      { priority: "MAJOR", responseTime: 120, resolutionTime: 240, rcaTime: 10, availability: "7*24" },
      { priority: "MINOR", responseTime: 240, resolutionTime: 1440, rcaTime: 10, availability: "7*24" },
      { priority: "REQUEST", responseTime: 480, resolutionTime: 43200, availability: "5*8" },
    ],
  });

  console.log("✅ Seed data inserted successfully!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });



  