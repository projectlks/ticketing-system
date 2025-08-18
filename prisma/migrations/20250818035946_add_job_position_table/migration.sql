/*
  Warnings:

  - You are about to drop the column `job_position` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `work_email` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "job_position",
DROP COLUMN "work_email",
ADD COLUMN     "jobPositionId" TEXT;

-- CreateTable
CREATE TABLE "public"."JobPosition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "public"."JobPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobPosition" ADD CONSTRAINT "JobPosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
