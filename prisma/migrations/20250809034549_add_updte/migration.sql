/*
  Warnings:

  - Added the required column `updaterId` to the `department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."department" ADD COLUMN     "updaterId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."department" ADD CONSTRAINT "department_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
