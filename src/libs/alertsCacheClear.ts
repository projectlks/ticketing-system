import {
  HELPDESK_CACHE_PREFIXES,
  helpdeskRedisKeys,
} from "@/app/helpdesk/cache/redis-keys";
import { invalidateCacheByPrefix } from "./redis-cache";

export async function clearAlertsCache() {
  // Legacy key (`tickets:unacknowledged:*`) နဲ့ helpdesk v1 key နှစ်မျိုးလုံးရှင်းထားမှ
  // transition ကာလမှာ stale cache မကျန်အောင်ကာကွယ်နိုင်ပါတယ်။
  await Promise.all([
    invalidateCacheByPrefix("tickets:unacknowledged"),
    invalidateCacheByPrefix("tickets:unacknowledged:"),
    invalidateCacheByPrefix(helpdeskRedisKeys.zabbixTickets()),
    invalidateCacheByPrefix(`${HELPDESK_CACHE_PREFIXES.alerts}:`),
  ]);
}
