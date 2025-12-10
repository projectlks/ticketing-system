-- CreateTable
CREATE TABLE "ZabbixTicket" (
    "id" SERIAL NOT NULL,
    "eventid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "clock" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZabbixTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZabbixTicket_eventid_key" ON "ZabbixTicket"("eventid");
