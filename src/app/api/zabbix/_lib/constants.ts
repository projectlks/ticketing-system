/**
 * Central place for Zabbix route constants.
 *
 * Keeping constants here makes behavior obvious and avoids hidden magic values
 * inside deeply nested helper logic.
 */

export const DEFAULT_CUSTOMER_EMAIL = "support@eastwindmyanmar.com.mm";

const APP_PORT = process.env.PORT?.trim() || "4000";

/**
 * create-ticket fallback target:
 * - Primary call uses current request origin (if available)
 * - Fallback call uses localhost with app port
 */
export const LOCAL_CREATE_TICKET_URL =
  process.env.LOCAL_CREATE_TICKET_URL?.trim() ||
  `http://127.0.0.1:${APP_PORT}/api/create-ticket`;

/**
 * Audit source marker used in internal ticket audit rows.
 */
export const AUTO_AUDIT_SOURCE = "Zabbix";
