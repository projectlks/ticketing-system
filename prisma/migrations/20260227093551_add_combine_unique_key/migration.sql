/*
  Warnings:

  - A unique constraint covering the columns `[triggerId,hostName]` on the table `ZabbixTicket` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ZabbixTicket_eventid_key";

-- CreateIndex
CREATE UNIQUE INDEX "ZabbixTicket_triggerId_hostName_key" ON "ZabbixTicket"("triggerId", "hostName");
