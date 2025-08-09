/*
  Warnings:

  - You are about to drop the column `createdById` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_updatedById_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "createdById",
DROP COLUMN "updatedById",
ADD COLUMN     "createdId" TEXT,
ADD COLUMN     "updatedId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_createdId_fkey" FOREIGN KEY ("createdId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_updatedId_fkey" FOREIGN KEY ("updatedId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
