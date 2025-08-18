/*
  Warnings:

  - You are about to drop the column `assigned_to_id` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `requester_id` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requesterId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_department_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_requester_id_fkey";

-- AlterTable
ALTER TABLE "public"."JobPosition" ADD COLUMN     "creatorId" TEXT;

-- AlterTable
ALTER TABLE "public"."Ticket" DROP COLUMN "assigned_to_id",
DROP COLUMN "category_id",
DROP COLUMN "created_at",
DROP COLUMN "department_id",
DROP COLUMN "requester_id",
DROP COLUMN "updated_at",
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "departmentId" TEXT NOT NULL,
ADD COLUMN     "requesterId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."JobPosition" ADD CONSTRAINT "JobPosition_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
