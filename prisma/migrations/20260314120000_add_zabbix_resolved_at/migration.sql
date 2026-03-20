-- Add resolvedAt to ZabbixTicket for storing recovery timestamp
ALTER TABLE "ZabbixTicket" ADD COLUMN "resolvedAt" TIMESTAMP(3);
