"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  Squares2X2Icon,
  BuildingStorefrontIcon,
  TicketIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  {
    section: "Main",
    items: [
      {
        name: "Dashboard",
        href: "/main/dashboard",
        icon: Squares2X2Icon,
        activeCheck: (route: string) => route === "main.dashboard",
      },
      {
        name: "Department",
        href: "/main/department",
        icon: BuildingStorefrontIcon,
        activeCheck: (route: string) => route.startsWith("main.department"),
      },
      {
        name: "Tickets",
        href: "/main/tickets",
        icon: TicketIcon,
        activeCheck: (route: string) => route.startsWith("main.tickets"),
        badge: (count: number) =>
          count > 0 && (
            <span
              title="Opening tickets not assigned to Developer/Engineer"
              className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full"
            >
              {count}
            </span>
          ),
      },
      {
        name: "Report",
        href: "/admin/report/tickets",
        icon: ChartBarIcon,
        activeCheck: (route: string) =>
          ["admin.report.tickets", "admin.report"].includes(route),
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        name: "Users",
        href: "/main/accounts",
        icon: UserGroupIcon,
        activeCheck: (route: string) => route.startsWith("admin.agent"),
      },
      {
        name: "Category",
        href: "/main/category",
        icon: AdjustmentsHorizontalIcon,
        activeCheck: (route: string) => route.startsWith("category"),
      },
    ],
  },
];

export default function Sidebar({
  adminSideBarTicketCount = 0,
  currentRouteName = "",
}) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [selectedDropdown, setSelectedDropdown] = useState("");

  const toggleDropdown = (name: string) => {
    setSelectedDropdown(selectedDropdown === name ? "" : name);
  };

  return (
    <aside
      onClick={() => setOpenSidebar(false)}
      className={`${
        openSidebar ? "translate-x-0 lg:w-[0px] lg:px-0" : "-translate-x-full"
      } sidebar fixed top-0 left-0 flex h-screen  min-w-[300px] w-[300px] flex-col overflow-y-auto border-r border-gray-200 bg-white px-5 transition-all z-50 duration-300 lg:static lg:translate-x-0 -translate-x-full`}
    >
      {/* Logo */}
      <div className="flex items-center pt-8 space-x-3 pb-7">
        <Image src="/logo.png" alt="logo" className="w-8 h-8" width={32} height={32} />
        <h1 className="text-2xl font-bold text-gray-800">East Wind</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-6">
        {navItems.map(({ section, items }) => (
          <div key={section}>
            <div className="w-full text-xs text-gray-600 mb-2">{section}</div>
            <div className="space-y-2">
              {items.map(({ name, href, icon: Icon, activeCheck, badge }) => {
                const active = activeCheck(currentRouteName);
                return (
                  <Link
                    key={name}
                    href={href}
                    className={`group h-[40px] flex items-center space-x-3 py-2 px-3 rounded-lg transition-colors duration-200 ${
                      active
                        ? "bg-[#ecf3ff] text-blue-600"
                        : "text-gray-700 hover:text-blue-600 hover:bg-[#ecf3ff]"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {name}
                      {badge && badge(adminSideBarTicketCount)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Settings Dropdown */}
        <div>
          <div className="w-full text-xs text-gray-600 mb-2">Setting</div>

          <div className="space-y-1">
            <div
              onClick={() => toggleDropdown("settings")}
              className={`group h-[40px] flex items-center justify-between space-x-3 cursor-pointer py-2 px-3 rounded-lg hover:bg-[#ecf3ff] transition-colors duration-200 ${
                currentRouteName === "admin.account_setting"
                  ? "bg-[#ecf3ff] text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Cog6ToothIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Setting</span>
              </div>

              <svg
                className={`transition-transform duration-200 w-4 h-4 ${
                  selectedDropdown === "settings" ? "rotate-180" : "rotate-0"
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
                stroke="currentColor"
              >
                <path
                  d="M6 8l4 4 4-4"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {selectedDropdown === "settings" && (
              <ul className="flex flex-col gap-1 mt-2 pl-9">
                <li>
                  <Link
                    href="/admin/account_setting"
                    className={`block text-sm py-2.5 px-3 rounded hover:text-blue-600 hover:bg-[#ecf3ff] transition ${
                      currentRouteName === "admin.account_setting"
                        ? "bg-[#ecf3ff] text-blue-600"
                        : "text-gray-700 hover:text-blue-600 hover:bg-[#ecf3ff]"
                    }`}
                  >
                    Account Setting
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}
