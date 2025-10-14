import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
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
    },
  });

  // console.log("✅ Essential seed data inserted!");

  // check if mail setting already exists
  const existing = await prisma.mailSetting.findFirst();
  if (!existing) {
    await prisma.mailSetting.create({
      data: {
        emails: ["support@eastwindmyanmar.com.mm"], // default support email
      },
    });
    console.log("✅ MailSetting seeded successfully");
  } else {
    console.log("ℹ️ MailSetting already exists, skipping seeding");
  }

  await prisma.sLA.createMany({
    data: [
      {
      priority: "CRITICAL",
        responseTime: 30, // 30 min
        resolutionTime: 120, // 2 hours
        rcaTime: 7, // 7 days
        availability: "7*24",
      },
      {
        priority: "MAJOR",
        responseTime: 120, // 2 hours
        resolutionTime: 240, // 4 hours
        rcaTime: 10, // 10 days
        availability: "7*24",
      },
      {
        priority: "MINOR",
        responseTime: 240, // 4 hours
        resolutionTime: 1440, // 24 hours
        rcaTime: 10, // 10 working days
        availability: "7*24",
      },
      {
        priority: "REQUEST",
        responseTime: 480, // 8 hours
        resolutionTime: 43200, // 30 days
        availability: "5*8",
      },
    ],
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
