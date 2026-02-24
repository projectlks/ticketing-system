"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAnalysisDashboardData,
  type AnalysisDashboardData,
  type AnalysisFilterInput,
  type AnalysisRecentTicket as Ticket,
  type AnalysisTicketData as TicketData,
} from "./action";
import DepartmentPerformanceSection from "./components/DepartmentPerformanceSection";
import FilterToolbar from "./components/FilterToolbar";
import KpiGrid from "./components/KpiGrid";
import PriorityChartCard from "./components/PriorityChartCard";
import RecentTicketsTable from "./components/RecentTicketsTable";
import TrendChartCard from "./components/TrendChartCard";
import { getQuickRangeValues, type QuickRange } from "./filter-range";

export default function Dashboard() {
  // Server data state ?????? page container ??????????????
  // child components ?????? props ???????????????? structure ?????????????
  const [ticketData, setTicketData] = useState<TicketData[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [kpi, setKpi] = useState<AnalysisDashboardData["kpi"]>({
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    highPriorityTickets: 0,
  });
  const [priorityBreakdown, setPriorityBreakdown] = useState<
    AnalysisDashboardData["priorityBreakdown"]
  >({
    high: 0,
    medium: 0,
    low: 0,
  });

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<AnalysisFilterInput>({
    fromDate: "",
    toDate: "",
  });
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const appliedFromDate = appliedFilter.fromDate ?? "";
  const appliedToDate = appliedFilter.toDate ?? "";
  const hasPendingFilterChanges =
    fromDate !== appliedFromDate || toDate !== appliedToDate;

  // Applied filter ????????????????????? server action ???????????
  // UI draft values ??? network request ???????????????
  useEffect(() => {
    let isMounted = true;
    const requestFilter: AnalysisFilterInput = {
      fromDate: appliedFromDate,
      toDate: appliedToDate,
    };

    const loadDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getAnalysisDashboardData(requestFilter);
        if (!isMounted) return;

        setTicketData(data.ticketData);
        setRecentTickets(data.recentTickets);
        setKpi(data.kpi);
        setPriorityBreakdown(data.priorityBreakdown);
        setLastUpdatedAt(new Date().toLocaleString());
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load analysis dashboard data.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [appliedFromDate, appliedToDate]);

  const appliedRangeLabel = useMemo(() => {
    if (!appliedFromDate && !appliedToDate) return "All time";
    if (appliedFromDate && appliedToDate)
      return `${appliedFromDate} to ${appliedToDate}`;
    return appliedFromDate
      ? `From ${appliedFromDate}`
      : `Until ${appliedToDate}`;
  }, [appliedFromDate, appliedToDate]);

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setActiveQuickRange("custom");
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setActiveQuickRange("custom");
  };

  const handleApplyFilters = () => {
    if (invalidDateRange) {
      setErrorMessage("From date must be earlier than or equal to To date.");
      return;
    }

    setErrorMessage(null);
    setAppliedFilter({ fromDate, toDate });

    if (fromDate || toDate) {
      setActiveQuickRange("custom");
    } else {
      setActiveQuickRange("all");
    }
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setAppliedFilter({ fromDate: "", toDate: "" });
    setActiveQuickRange("all");
    setErrorMessage(null);
  };

  const handleQuickRange = (range: Exclude<QuickRange, "custom">) => {
    const values = getQuickRangeValues(range);
    setFromDate(values.fromDate);
    setToDate(values.toDate);
    setAppliedFilter(values);
    setActiveQuickRange(range);
    setErrorMessage(null);
  };

  const handleDownload = () => {
    if (hasPendingFilterChanges || invalidDateRange) {
      setErrorMessage("Apply a valid date range before downloading.");
      return;
    }

    const query = new URLSearchParams();
    if (appliedFromDate) query.set("fromDate", appliedFromDate);
    if (appliedToDate) query.set("toDate", appliedToDate);

    const search = query.toString();
    const url = search
      ? `/api/helpdesk/export?${search}`
      : "/api/helpdesk/export";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111]">
      <FilterToolbar
        appliedRangeLabel={appliedRangeLabel}
        activeQuickRange={activeQuickRange}
        fromDate={fromDate}
        toDate={toDate}
        isLoading={isLoading}
        invalidDateRange={invalidDateRange}
        hasPendingFilterChanges={hasPendingFilterChanges}
        errorMessage={errorMessage}
        lastUpdatedAt={lastUpdatedAt}
        onFromDateChange={handleFromDateChange}
        onToDateChange={handleToDateChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onDownload={handleDownload}
        onQuickRange={handleQuickRange}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <KpiGrid kpi={kpi} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <TrendChartCard ticketData={ticketData} />
          <PriorityChartCard priorityBreakdown={priorityBreakdown} />
        </div>

        <DepartmentPerformanceSection ticketData={ticketData} />
        <RecentTicketsTable recentTickets={recentTickets} />
      </main>
    </div>
  );
}
