// ===========================
// Zabbix Types
// ===========================

// Tag attached to a problem
export interface ZabbixTag {
  tag: string;
  value: string;
}

// Acknowledge attached to a problem
export interface ZabbixAcknowledge {
  acknowledgeid: string;
  eventid: string;
  userid: string;
  clock: string;
  message: string;
}

// Suppression data for a problem
export interface ZabbixSuppressionData {
  maintenanceid?: string;
  suppress_until?: number;
}

// Host information related to a problem
export interface ZabbixHost {
  hostid: string;
  host: string;
}

// Main Zabbix problem object
export interface ZabbixProblem {
  eventid: string;
  source: string;
  object: string;
  objectid: string;
  clock: string;
  ns: string;
  r_eventid: string;
  r_clock: string;
  r_ns: string;
  correlationid: string;
  userid: string;
  name: string;
  acknowledged: string;
  severity: string;

  tags: ZabbixTag[];
  acknowledges: ZabbixAcknowledge[];
  suppression_data: ZabbixSuppressionData[];

  // Optional fields used in UI rendering
  opdata?: string;
  hosts?: ZabbixHost[];
  suppressed?: string;
}

// Response returned from Zabbix API
export interface ZabbixResponse {
  jsonrpc: string;
  result: ZabbixProblem[];
  id: number;
}
