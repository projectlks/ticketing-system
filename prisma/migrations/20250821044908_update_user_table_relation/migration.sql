/*
  Warnings:

  - You are about to drop the column `date_of_birth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `identification_no` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `manager` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `marital_status` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `number_of_children` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passport_no` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `personal_email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `personal_phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `work_mobile` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "date_of_birth",
DROP COLUMN "department",
DROP COLUMN "emergency_contact",
DROP COLUMN "emergency_phone",
DROP COLUMN "employee_id",
DROP COLUMN "identification_no",
DROP COLUMN "manager",
DROP COLUMN "marital_status",
DROP COLUMN "number_of_children",
DROP COLUMN "passport_no",
DROP COLUMN "personal_email",
DROP COLUMN "personal_phone",
DROP COLUMN "work_mobile",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "identificationNo" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "numberOfChildren" INTEGER,
ADD COLUMN     "passportNo" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "personalPhone" TEXT,
ADD COLUMN     "workMobile" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_departmentId_idx" ON "public"."Ticket"("departmentId");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "public"."Ticket"("assignedToId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
