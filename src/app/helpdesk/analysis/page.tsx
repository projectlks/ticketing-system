"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { AnalysisDashboardData, AnalysisFilterInput } from "./action";
import DepartmentPerformanceSection from "./components/DepartmentPerformanceSection";
import FilterToolbar from "./components/FilterToolbar";
import KpiGrid from "./components/KpiGrid";
import PriorityChartCard from "./components/PriorityChartCard";
import RecentTicketsTable from "./components/RecentTicketsTable";
import TrendChartCard from "./components/TrendChartCard";
import { getQuickRangeValues, type QuickRange } from "./filter-range";
import { analysisDashboardQueryOptions } from "../queries/query-options";

const EMPTY_DASHBOARD_DATA: AnalysisDashboardData = {
  ticketData: [],
  recentTickets: [],
  priorityBreakdown: {
    high: 0,
    medium: 0,
    low: 0,
  },
  kpi: {
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    highPriorityTickets: 0,
  },
};

const EMPTY_FILTER: AnalysisFilterInput = {
  fromDate: "",
  toDate: "",
};

export default function Dashboard() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFilter, setAppliedFilter] =
    useState<AnalysisFilterInput>(EMPTY_FILTER);
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange>("all");
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const analysisQuery = useQuery(analysisDashboardQueryOptions(appliedFilter));

  const dashboardData = analysisQuery.data ?? EMPTY_DASHBOARD_DATA;
  const appliedFromDate = appliedFilter.fromDate ?? "";
  const appliedToDate = appliedFilter.toDate ?? "";

  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const hasPendingFilterChanges =
    fromDate !== appliedFromDate || toDate !== appliedToDate;

  const queryErrorMessage = analysisQuery.error
    ? analysisQuery.error instanceof Error
      ? analysisQuery.error.message
      : "Failed to load analysis dashboard data."
    : null;
  const errorMessage = formErrorMessage ?? queryErrorMessage;
  const isLoading = analysisQuery.isFetching;
  const lastUpdatedAt = analysisQuery.dataUpdatedAt
    ? new Date(analysisQuery.dataUpdatedAt).toLocaleString()
    : "";

  const appliedRangeLabel = useMemo(() => {
    if (!appliedFromDate && !appliedToDate) return "All time";
    if (appliedFromDate && appliedToDate) {
      return `${appliedFromDate} to ${appliedToDate}`;
    }

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
      setFormErrorMessage("From date must be earlier than or equal to To date.");
      return;
    }

    setFormErrorMessage(null);
    setAppliedFilter({ fromDate, toDate });
    setActiveQuickRange(fromDate || toDate ? "custom" : "all");
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setAppliedFilter(EMPTY_FILTER);
    setActiveQuickRange("all");
    setFormErrorMessage(null);
  };

  const handleQuickRange = (range: Exclude<QuickRange, "custom">) => {
    const values = getQuickRangeValues(range);
    setFromDate(values.fromDate);
    setToDate(values.toDate);
    setAppliedFilter(values);
    setActiveQuickRange(range);
    setFormErrorMessage(null);
  };

  const handleDownload = () => {
    if (hasPendingFilterChanges || invalidDateRange) {
      setFormErrorMessage("Apply a valid date range before downloading.");
      return;
    }

    const query = new URLSearchParams();
    if (appliedFromDate) query.set("fromDate", appliedFromDate);
    if (appliedToDate) query.set("toDate", appliedToDate);

    const search = query.toString();
    const url = search
      ? `/api/helpdesk/export?${search}`
      : "/api/helpdesk/export";

    // New tab popup blocker ပြဿနာရှောင်ဖို့ direct navigation download flow ကိုသုံးထားပါတယ်။
    window.location.assign(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[#111]">
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

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <KpiGrid kpi={dashboardData.kpi} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <TrendChartCard ticketData={dashboardData.ticketData} />
          <PriorityChartCard
            priorityBreakdown={dashboardData.priorityBreakdown}
          />
        </div>

        <DepartmentPerformanceSection ticketData={dashboardData.ticketData} />
        <RecentTicketsTable recentTickets={dashboardData.recentTickets} />
      </main>
    </div>
  );
}
