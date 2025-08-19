/*
  Warnings:

  - You are about to drop the column `title` on the `JobPosition` table. All the data in the column will be lost.
  - Added the required column `name` to the `JobPosition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `JobPosition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."JobPosition" DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."category" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
