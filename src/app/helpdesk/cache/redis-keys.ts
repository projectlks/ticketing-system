const HELPDESK_CACHE_PREFIX = "helpdesk:v1";

export const HELPDESK_CACHE_TTL_SECONDS = {
  overview: 60,
  departments: 120,
  departmentNames: 300,
  categories: 180,
  categoryNames: 300,
  users: 120,
  userAssign: 180,
  userById: 120,
  analysis: 90,
  ticketsList: 45,
  myTickets: 60,
  singleTicket: 45,
  ticketAudits: 30,
  zabbixTickets: 60,
  currentAlerts: 45,
} as const;

// Cache key prefix တွေကိုတစ်နေရာတည်းထားမှ mutation invalidate လုပ်ချိန်မှာ
// key typo မဖြစ်ဘဲ maintainability ကောင်းနေပါတယ်။
export const HELPDESK_CACHE_PREFIXES = {
  overview: `${HELPDESK_CACHE_PREFIX}:overview`,
  departments: `${HELPDESK_CACHE_PREFIX}:departments`,
  categories: `${HELPDESK_CACHE_PREFIX}:categories`,
  users: `${HELPDESK_CACHE_PREFIX}:users`,
  tickets: `${HELPDESK_CACHE_PREFIX}:tickets`,
  analysis: `${HELPDESK_CACHE_PREFIX}:analysis`,
  alerts: `${HELPDESK_CACHE_PREFIX}:alerts`,
} as const;

export const helpdeskRedisKeys = {
  overview: () => `${HELPDESK_CACHE_PREFIXES.overview}:dashboard`,
  departments: () => `${HELPDESK_CACHE_PREFIXES.departments}:stats`,
  departmentNames: () => `${HELPDESK_CACHE_PREFIXES.departments}:names`,
  categories: () => `${HELPDESK_CACHE_PREFIXES.categories}:list`,
  categoryNames: () => `${HELPDESK_CACHE_PREFIXES.categories}:names`,
  users: () => `${HELPDESK_CACHE_PREFIXES.users}:list`,
  userById: (userId: string) => `${HELPDESK_CACHE_PREFIXES.users}:detail:${userId}`,
  usersToAssign: () => `${HELPDESK_CACHE_PREFIXES.users}:assignable`,
  analysis: (fromDate: string, toDate: string) =>
    `${HELPDESK_CACHE_PREFIXES.analysis}:${fromDate || "all"}:${toDate || "all"}`,
  ticketsList: (userId: string | undefined, signature: string) =>
    `${HELPDESK_CACHE_PREFIXES.tickets}:list:${userId ?? "anonymous"}:${signature}`,
  myTickets: (userId: string) => `${HELPDESK_CACHE_PREFIXES.tickets}:my:${userId}`,
  singleTicket: (ticketId: string) => `${HELPDESK_CACHE_PREFIXES.tickets}:detail:${ticketId}`,
  ticketAudits: (ticketId: string) => `${HELPDESK_CACHE_PREFIXES.tickets}:audits:${ticketId}`,
  zabbixTickets: () => `${HELPDESK_CACHE_PREFIXES.alerts}:zabbix:list`,
  zabbixTicketsPage: (page: number, pageSize: number) =>
    `${HELPDESK_CACHE_PREFIXES.alerts}:zabbix:page:${page}:size:${pageSize}`,
  currentAlerts: (page: number, pageSize: number) =>
    `${HELPDESK_CACHE_PREFIXES.alerts}:current:page:${page}:size:${pageSize}`,
} as const;
