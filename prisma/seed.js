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
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
