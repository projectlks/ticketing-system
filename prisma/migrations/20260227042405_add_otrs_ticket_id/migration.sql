/*
  Warnings:

  - You are about to drop the column `acknowledgedAt` on the `ZabbixTicket` table. All the data in the column will be lost.
  - You are about to drop the column `acknowledgedBy` on the `ZabbixTicket` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[otrsTicketId]` on the table `ZabbixTicket` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ZabbixTicket" DROP COLUMN "acknowledgedAt",
DROP COLUMN "acknowledgedBy",
ADD COLUMN     "otrsTicketId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ZabbixTicket_otrsTicketId_key" ON "ZabbixTicket"("otrsTicketId");
