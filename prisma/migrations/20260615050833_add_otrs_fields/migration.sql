/*
  Warnings:

  - You are about to drop the column `otrsTicketNumber` on the `ZabbixTicket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "otrsTicketId" TEXT,
ADD COLUMN     "otrsTicketNumber" TEXT;

-- AlterTable
ALTER TABLE "ZabbixTicket" DROP COLUMN "otrsTicketNumber";
