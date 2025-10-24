/*
  Warnings:

  - You are about to drop the column `contact` on the `logs` table. All the data in the column will be lost.
  - Added the required column `contactId` to the `logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."logs" DROP COLUMN "contact",
ADD COLUMN     "contactId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
