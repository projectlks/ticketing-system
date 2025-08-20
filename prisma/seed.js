import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Example: Department
  await prisma.department.upsert({
    where: { name: "IT Department" },
    update: {},
    create: {
      name: "IT Department",
      description: "Handles all IT related tasks",
      managerId: "cmejivngx0001vffo6dhew3vb",
      creatorId: "cmejivngx0001vffo6dhew3vb",
      updaterId: "cmejivngx0001vffo6dhew3vb",
    },
  });

  // Example: Admin user
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: "hashedpassword",
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Seed completed!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
