import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ===== Users =====
  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {},
    create: {
      name: "Agent User",
      email: "agent@example.com",
      password: agentPassword,
      role: "AGENT",
    },
  });

  console.log("✅ Essential seed data inserted!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
