import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Default Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "ADMIN",
      creatorId: null,
      updaterId: null
    },
  });

  console.log("✅ Default admin created");
}

main()
  .catch((e) => {
    console.error("❌ Error creating default admin:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
