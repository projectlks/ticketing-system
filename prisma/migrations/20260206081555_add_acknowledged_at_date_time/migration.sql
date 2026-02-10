/*
  Warnings:

  - You are about to drop the column `emailSent` on the `ZabbixTicket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ZabbixTicket" DROP COLUMN "emailSent",
ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedBy" TEXT;
