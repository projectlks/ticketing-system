"use server";

import { prisma } from "@/libs/prisma";

// import { prisma } from "@/lib/prisma";



export async function getUsersEmails() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,  // optional, for display
    },
  });

  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));
}

export async function getMailSetting() {
  const setting = await prisma.mailSetting.findFirst();
  return setting ? setting.emails : [];
}

export async function saveMailSetting(emails: string[]) {
  const existing = await prisma.mailSetting.findFirst();

  if (existing) {
    await prisma.mailSetting.update({
      where: { id: existing.id },
      data: { emails },
    });
  } else {
    await prisma.mailSetting.create({
      data: { emails },
    });
  }

  return { success: true };
}
