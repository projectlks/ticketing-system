import {
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getAnalysisDashboardData,
  type AnalysisFilterInput,
} from "../analysis/action";
import { getPaginatedZabbixTickets } from "../alerts/action";
import { getCategories } from "../category/action";
import { getDepartmentNames, getDepartments } from "../department/action";
import { getAllTickets, getMyTickets, type GetTicketsOptions } from "../tickets/action";
import { getUsers } from "../user/action";
import type { ZabbixProblem } from "@/types/zabbix";

type TicketSearchFilters = Record<string, string[]>;

type AlertTicketProjection = {
  id: number | string;
  eventid: string;
  name: string;
  status: string;
  clock: Date | string;
  tags: string | null;
  hostName: string | null;
  triggerSeverity: string | null;
};

export type AlertsListQueryInput = {
  filter: string;
  page: number;
  pageSize: number;
};

export type AlertsQueryResponse = {
  alerts: ZabbixProblem[];
  total: number;
  page: number;
  pageSize: number;
};

const normalizeRecordValues = (record: TicketSearchFilters = {}) =>
  Object.entries(record)
    .map(([key, values]) => [key, [...values].sort()] as const)
    .sort(([a], [b]) => a.localeCompare(b));

const normalizeAnalysisFilter = (filter: AnalysisFilterInput = {}) => ({
  fromDate: filter.fromDate ?? "",
  toDate: filter.toDate ?? "",
});

const normalizeAlertsQueryInput = (input: AlertsListQueryInput): AlertsListQueryInput => ({
  filter: input.filter,
  page: Math.max(1, input.page),
  pageSize: Math.max(1, input.pageSize),
});

// Query key ကိုတစ်နေရာတည်းမှာပေါင်းထားမှ invalidation/prefetch သုံးချိန်မှာ typo မဖြစ်ဘဲ
// module တစ်ခုလုံး consistency ရှိနေစေပါတယ်။
export const helpdeskQueryKeys = {
  overview: ["helpdesk", "overview"] as const,
  departments: ["helpdesk", "departments"] as const,
  departmentNames: ["helpdesk", "department-names"] as const,
  categories: ["helpdesk", "categories"] as const,
  users: ["helpdesk", "users"] as const,
  tickets: {
    all: ["helpdesk", "tickets"] as const,
    list: (input: TicketsListQueryInput) =>
      [
        "helpdesk",
        "tickets",
        "list",
        input.page,
        input.pageSize,
        normalizeRecordValues(input.search),
        normalizeRecordValues(input.filters),
      ] as const,
  },
  analysis: {
    all: ["helpdesk", "analysis"] as const,
    dashboard: (filter: AnalysisFilterInput) =>
      [
        "helpdesk",
        "analysis",
        "dashboard",
        normalizeAnalysisFilter(filter),
      ] as const,
  },
  alerts: {
    all: ["helpdesk", "alerts"] as const,
    list: (input: AlertsListQueryInput) => {
      const normalizedInput = normalizeAlertsQueryInput(input);
      return [
        "helpdesk",
        "alerts",
        normalizedInput.filter,
        normalizedInput.page,
        normalizedInput.pageSize,
      ] as const;
    },
  },
};

export type OverviewQueryData = {
  departments: Awaited<ReturnType<typeof getDepartments>>;
  ticketStats: Awaited<ReturnType<typeof getMyTickets>>;
};

export type TicketsListQueryInput = {
  search: TicketSearchFilters;
  filters: TicketSearchFilters;
  page: number;
  pageSize: number;
};

export const DEFAULT_TICKETS_QUERY_INPUT: TicketsListQueryInput = {
  search: {},
  filters: {},
  page: 1,
  pageSize: 10,
};

export const DEFAULT_ALERTS_QUERY_INPUT: AlertsListQueryInput = {
  filter: "Zabbix",
  page: 1,
  pageSize: 10,
};

export const toTicketsListQueryInput = (
  input: GetTicketsOptions = {},
): TicketsListQueryInput => ({
  search: input.search ?? {},
  filters: input.filters ?? {},
  page: input.page ?? DEFAULT_TICKETS_QUERY_INPUT.page,
  pageSize: input.pageSize ?? DEFAULT_TICKETS_QUERY_INPUT.pageSize,
});

export const overviewQueryOptions = () =>
  queryOptions({
    queryKey: helpdeskQueryKeys.overview,
    queryFn: async (): Promise<OverviewQueryData> => {
      const [departments, ticketStats] = await Promise.all([
        getDepartments(),
        getMyTickets(),
      ]);

      return { departments, ticketStats };
    },
    placeholderData: keepPreviousData,
  });

export const departmentsQueryOptions = () =>
  queryOptions({
    queryKey: helpdeskQueryKeys.departments,
    queryFn: () => getDepartments(),
    placeholderData: keepPreviousData,
  });

export const departmentNamesQueryOptions = () =>
  queryOptions({
    queryKey: helpdeskQueryKeys.departmentNames,
    queryFn: () => getDepartmentNames(),
    placeholderData: keepPreviousData,
  });

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: helpdeskQueryKeys.categories,
    queryFn: () => getCategories(),
    placeholderData: keepPreviousData,
  });

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: helpdeskQueryKeys.users,
    queryFn: () => getUsers(),
    placeholderData: keepPreviousData,
  });

export const ticketsListQueryOptions = (input: TicketsListQueryInput) =>
  queryOptions({
    queryKey: helpdeskQueryKeys.tickets.list(input),
    queryFn: () => getAllTickets(input),
    // Page/filter ပြောင်းချိန်မှာ old table data ကိုခဏထိန်းထားလို့ flicker လျော့ပြီး UX တည်ငြိမ်ပါတယ်။
    placeholderData: keepPreviousData,
  });

export const analysisDashboardQueryOptions = (
  filter: AnalysisFilterInput = {},
) =>
  queryOptions({
    queryKey: helpdeskQueryKeys.analysis.dashboard(filter),
    queryFn: () => getAnalysisDashboardData(filter),
    placeholderData: keepPreviousData,
  });

const mapAlertTicketToProblem = (
  ticket: AlertTicketProjection,
): ZabbixProblem => ({
  eventid: ticket.eventid,
  name: ticket.name,
  source: "",
  object: "",
  objectid: "",
  clock: Math.floor(new Date(ticket.clock).getTime() / 1000).toString(),
  tags: ticket.tags
    ? ticket.tags
        .split(",")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const [tag, ...rest] = pair.split(":");
          return {
            tag: tag?.trim() ?? "",
            value: rest.join(":").trim(),
          };
        })
        .filter((tag) => tag.tag && tag.value)
    : [],
  opdata: "",
  r_clock: "",
  hosts: ticket.hostName
    ? [{ hostid: String(ticket.id), host: ticket.hostName }]
    : [],
  suppressed: "",
  suppression_data: [],
  severity: ticket.triggerSeverity ?? "0",
  r_eventid: ticket.status,
  ns: "0",
  r_ns: "0",
  correlationid: "",
  userid: "",
  acknowledged: "0",
  acknowledges: [],
});

export const alertsProblemsQueryOptions = (
  input: AlertsListQueryInput,
  apiKey?: string,
) =>
  queryOptions({
    queryKey: helpdeskQueryKeys.alerts.list(input),
    queryFn: async (): Promise<AlertsQueryResponse> => {
      const normalizedInput = normalizeAlertsQueryInput(input);

      if (normalizedInput.filter === "All Alerts") {
        const response = await getPaginatedZabbixTickets({
          page: normalizedInput.page,
          pageSize: normalizedInput.pageSize,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error ?? "Failed to fetch backend alerts.");
        }

        return {
          alerts: response.data.map((ticket) =>
            mapAlertTicketToProblem(ticket as AlertTicketProjection),
          ),
          total: response.total ?? response.data.length,
          page: response.page ?? normalizedInput.page,
          pageSize: response.pageSize ?? normalizedInput.pageSize,
        };
      }

      const resolvedApiKey = apiKey ?? process.env.NEXT_PUBLIC_API_SECRET_KEY;
      if (!resolvedApiKey) {
        throw new Error("NEXT_PUBLIC_API_SECRET_KEY is not configured.");
      }

      const queryParams = new URLSearchParams({
        page: String(normalizedInput.page),
        pageSize: String(normalizedInput.pageSize),
      });

      const response = await fetch(`/api/alerts?${queryParams.toString()}`, {
        headers: { "x-api-key": resolvedApiKey },
      });

      const payload = (await response.json()) as {
        data?: AlertTicketProjection[];
        result?: AlertTicketProjection[];
        total?: number;
        page?: number;
        pageSize?: number;
        count?: number;
        error?: string;
      };
      const alerts = payload.data ?? payload.result;

      if (!response.ok || !alerts) {
        throw new Error(payload.error ?? "Failed to fetch alerts.");
      }

      return {
        alerts: alerts.map((ticket) => mapAlertTicketToProblem(ticket)),
        total: payload.total ?? payload.count ?? alerts.length,
        page: payload.page ?? normalizedInput.page,
        pageSize: payload.pageSize ?? normalizedInput.pageSize,
      };
    },
    // page/pageSize ပြောင်းချိန် old page data ကိုခဏထိန်းထားလို့ table jump/flicker မဖြစ်စေပါ။
    placeholderData: keepPreviousData,
    refetchInterval: input.filter === "All Alerts" ? false : 60_000,
    refetchIntervalInBackground: true,
  });

export async function prefetchHelpdeskRouteData(
  queryClient: QueryClient,
  pathname: string,
) {
  // Navigation hover/focus prefetch အတွက် route-to-query mapping တစ်နေရာတည်းထားပြီး
  // duplicated logic မဖြစ်အောင် maintainability မြှင့်ထားပါတယ်။
  if (pathname === "/helpdesk") {
    await queryClient.prefetchQuery(overviewQueryOptions());
    return;
  }

  if (pathname === "/helpdesk/tickets") {
    await queryClient.prefetchQuery(
      ticketsListQueryOptions(DEFAULT_TICKETS_QUERY_INPUT),
    );
    return;
  }

  if (pathname === "/helpdesk/analysis") {
    await queryClient.prefetchQuery(analysisDashboardQueryOptions({}));
    return;
  }

  if (pathname === "/helpdesk/alerts") {
    await queryClient.prefetchQuery(
      alertsProblemsQueryOptions(DEFAULT_ALERTS_QUERY_INPUT),
    );
    return;
  }

  if (pathname === "/helpdesk/category") {
    await Promise.all([
      queryClient.prefetchQuery(categoriesQueryOptions()),
      queryClient.prefetchQuery(departmentNamesQueryOptions()),
    ]);
    return;
  }

  if (pathname === "/helpdesk/department") {
    await queryClient.prefetchQuery(departmentsQueryOptions());
    return;
  }

  if (pathname === "/helpdesk/user") {
    await queryClient.prefetchQuery(usersQueryOptions());
    return;
  }
}
