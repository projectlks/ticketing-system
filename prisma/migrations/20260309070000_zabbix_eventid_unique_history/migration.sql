-- Keep one row per Zabbix event, not per trigger/host snapshot.
DROP INDEX IF EXISTS "ZabbixTicket_triggerId_hostName_key";
DROP INDEX IF EXISTS "ZabbixTicket_eventid_idx";

CREATE UNIQUE INDEX "ZabbixTicket_eventid_key" ON "ZabbixTicket"("eventid");
CREATE INDEX "ZabbixTicket_triggerId_hostName_idx" ON "ZabbixTicket"("triggerId", "hostName");
