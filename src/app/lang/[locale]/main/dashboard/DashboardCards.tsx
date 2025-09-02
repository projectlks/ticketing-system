"use client";

import React from "react";
import {
  ClipboardIcon,
  InboxIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface CardData {
  title: string;
  subtitle: string;
  count: string;
  iconColor: string;
  iconBorder: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  badgeColor: "red" | "emerald" | "yellow" | "blue" | "indigo"; // restrict Tailwind colors
  badgeText: string;
  badgeIconRotate?: boolean;
}

interface StatusCounts {
  all: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}
type Trend = "up" | "down" | "same";

export interface MonthlyStats {
  thisMonth: StatusCounts;
  lastMonth: StatusCounts;
  percentChange: StatusCounts;
  trends: { [K in keyof StatusCounts]: Trend };
}

interface DashboardCardsProps {
  stats: MonthlyStats;
}

const DashboardCard: React.FC<CardData> = ({
  title,
  subtitle,
  count,
  iconColor,
  iconBorder,
  Icon,
  badgeColor,
  badgeText,
  badgeIconRotate = false,
}) => {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`rounded-full relative h-12 w-12 flex justify-center items-center dark:border-gray-300 border ${iconBorder} ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="h-fit">
          <h3 className="text-md uppercase mb-0 font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-300">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-md font-semibold text-gray-900 dark:text-gray-100">{count}</div>
        <div
          className={`bg-${badgeColor}-100 dark:bg-${badgeColor}-700 text-${badgeColor}-700 dark:text-gray-900 text-sm px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}
        >
          <svg
            viewBox="0 0 13 12"
            fill="currentColor"
            className={`h-3 w-3 ${badgeIconRotate ? "rotate-180" : ""}`}
          >
            <path d="M6.1 1.6a.7.7 0 011 .1l3 3a.7.7 0 01-1 1L7.4 3.9v6.2a.7.7 0 11-1.4 0V3.9L4.1 5.7a.7.7 0 01-1-1l3-3a.7.7 0 011-.1z" />
          </svg>
          {badgeText}
        </div>

      </div>
    </div>

  );
};

const DashboardCards: React.FC<DashboardCardsProps> = ({ stats }) => {
  const t = useTranslations();
  const cards: CardData[] = [
    {
      title: t("dashboardCards.total.title"),
      subtitle: t("dashboardCards.total.subtitle"),
      count: `${stats.thisMonth.all} tickets`,
      iconColor: "text-red-600",
      iconBorder: "border-red-100",
      Icon: ClipboardIcon,
      badgeColor: stats.trends.all === "up" ? "emerald" : "red",
      badgeText: `${stats.percentChange.all.toFixed(2)}%`,
      badgeIconRotate: stats.trends.all === "down",
    },
    {
      title: t("dashboardCards.open.title"),
      subtitle: t("dashboardCards.open.subtitle"),
      count: `${stats.thisMonth.open}`,
      iconColor: "text-blue-600",
      iconBorder: "border-blue-100",
      Icon: InboxIcon,
      badgeColor: stats.trends.open === "up" ? "emerald" : "red",
      badgeText: `${stats.percentChange.open.toFixed(2)}%`,
      badgeIconRotate: stats.trends.open === "down",
    },
    {
      title: t("dashboardCards.pending.title"),
      subtitle: t("dashboardCards.pending.subtitle"),
      count: `${stats.thisMonth.inProgress}`,
      iconColor: "text-yellow-600",
      iconBorder: "border-yellow-100",
      Icon: ClockIcon,
      badgeColor: stats.trends.inProgress === "up" ? "emerald" : "red",
      badgeText: `${stats.percentChange.inProgress.toFixed(2)}%`,
      badgeIconRotate: stats.trends.inProgress === "down",
    },
    {
      title: t("dashboardCards.closed.title"),
      subtitle: t("dashboardCards.closed.subtitle"),
      count: `${stats.thisMonth.closed}`,
      iconColor: "text-indigo-600",
      iconBorder: "border-indigo-100",
      Icon: CheckCircleIcon,
      badgeColor: stats.trends.closed === "up" ? "emerald" : "red",
      badgeText: `${stats.percentChange.closed.toFixed(2)}%`,
      badgeIconRotate: stats.trends.closed === "down",
    },
  ];;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <DashboardCard key={index} {...card} />
      ))}



    </div>
  );
};

export default DashboardCards;
