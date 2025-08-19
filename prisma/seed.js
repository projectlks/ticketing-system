// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 🔹 Create default admin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Default Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      creatorId: null,
      updaterId: null,
    },
  });

  // 🔹 Create default department
  const department = await prisma.department.upsert({
    where: { name: "IT Department" },
    update: {},
    create: {
      name: "IT Department",
      description: "Handles all IT related tasks",
      managerId: admin.id,
      creatorId: admin.id,
      updaterId: admin.id,
    },
  });

  // 🔹 Create default category
  const category = await prisma.category.upsert({
    where: { name: "General" },
    update: {},
    create: {
      name: "General",
      creatorId: admin.id,
      updaterId: admin.id,
    },
  });

  // 🔹 Create default job position
  const jobPosition = await prisma.jobPosition.upsert({
    where: { title: "Software Engineer" },
    update: {},
    create: {
      title: "Software Engineer",
      departmentId: department.id,
      creatorId: admin.id,
    },
  });

  console.log("✅ Default data created successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error creating default data:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
