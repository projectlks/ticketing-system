/*
  Warnings:

  - You are about to drop the column `createdId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedId` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('REQUESTER', 'AGENT', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_createdId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_updatedId_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "createdId",
DROP COLUMN "updatedId",
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "updaterId" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'REQUESTER';

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "attached" TEXT,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit" (
    "id" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "categoryId" TEXT,
    "ticketId" TEXT,

    CONSTRAINT "audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_entity_entityId_idx" ON "public"."audit"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_changedAt_idx" ON "public"."audit"("changedAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit" ADD CONSTRAINT "audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit" ADD CONSTRAINT "audit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit" ADD CONSTRAINT "audit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit" ADD CONSTRAINT "audit_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
