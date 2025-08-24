"use client";

import { Dispatch, JSX, SetStateAction, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  Squares2X2Icon,
  BuildingStorefrontIcon,
  TicketIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { getUnseenTicketCount } from "@/libs/action";
import { useTicketCount } from "@/context/TicketCountContext";
// import { getTicketCount } from "@/libs/action";

export type Role = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "REQUESTER";

interface NavItem {
  name: string;
  href: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  activeCheck: (route: string) => boolean;
  // badge?: (count: number) => JSX.Element | false;
  badge?: (count: number) => JSX.Element | false;

  roles?: Role[]; // Only visible for these roles
}

const navItems: { section: string; items: NavItem[] }[] = [
  {
    section: "Main",
    items: [
      {
        name: "Dashboard",
        href: "/main/dashboard",
        icon: Squares2X2Icon,
        activeCheck: (route) => route === "/main/dashboard",
        roles: ["SUPER_ADMIN", "ADMIN", "AGENT", "REQUESTER"],
      },
      {
        name: "Department",
        href: "/main/department",
        icon: BuildingStorefrontIcon,
        activeCheck: (route) => route.startsWith("/main/department"),
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        name: "Tickets",
        href: "/main/tickets",
        icon: TicketIcon,
        activeCheck: (route) => route.startsWith("/main/tickets"),
        roles: ["SUPER_ADMIN", "ADMIN", "AGENT", "REQUESTER"],
        badge: (count) =>
          count > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 text-gray-100 text-xs px-2">
              {count}
            </span>
          ) : false,
      },
      {
        name: "Reports",
        href: "/main/reports",
        icon: ChartBarIcon,
        activeCheck: (route) => ["/main/report", "/main/reports"].includes(route),
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        name: "Accounts",
        href: "/main/accounts",
        icon: UserGroupIcon,
        activeCheck: (route) => route.startsWith("/main/accounts"),
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        name: "Category",
        href: "/main/category",
        icon: AdjustmentsHorizontalIcon,
        activeCheck: (route) => route.startsWith("/main/category"),
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
    ],
  },
];

interface Props {
  openSidebar: boolean;
  setOpenSidebar: Dispatch<SetStateAction<boolean>>;

}

export default function Sidebar({ openSidebar }: Props) {
  const [selectedDropdown, setSelectedDropdown] = useState("");
  const pathname = usePathname();
  const { ticketCount } = useTicketCount();



  const toggleDropdown = (name: string) => {
    setSelectedDropdown(selectedDropdown === name ? "" : name);
  };

  const { data } = useSession()
  // Filter navItems based on role
  const filteredNavItems = navItems.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(data?.user.role as Role)
    ),
  }));

  return (
    <aside
      // onClick={() => setOpenSidebar(false)}
      className={`sidebar flex h-screen  flex-col overflow-y-auto 
        ${openSidebar ? "translate-x-0 lg:w-[0px] lg:px-0  " : "-translate-x-full "} 




         fixed top-0 left-0 flex h-screen w-[300px] flex-col overflow-y-auto border-r border-gray-200 bg-white px-5 transition-all z-50 duration-300 lg:static lg:translate-x-0 -translate-x-full        `}

    // className="w-full bg-red-900"
    >
      {/* Logo */}
      <div className="flex items-center pt-8 space-x-3 pb-7">
        <Image src="/logo.png" alt="logo" className="w-8 h-8" width={32} height={32} />
        <h1 className="text-2xl font-bold text-gray-800">East Wind</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-6">
        {filteredNavItems.map(({ section, items }) => (
          <div key={section}>
            <div className="w-full text-xs text-gray-600 mb-2">{section}</div>
            <div className="space-y-2">
              {items.map(({ name, href, icon: Icon, activeCheck, badge }) => {
                const isActive = activeCheck(pathname);
                return (
                  <Link
                    key={name}
                    href={href}
                    className={`group h-[40px] flex items-center space-x-3 py-2 px-3 rounded-lg transition-colors duration-200 ${isActive
                      ? "bg-[#ecf3ff] text-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-[#ecf3ff]"
                      }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="flex items-center justify-between  w-full gap-2 text-sm font-medium">
                      {name}
                      {badge && badge(name === "Tickets" ? ticketCount : 0)}
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
              className={`group h-[40px] flex items-center justify-between space-x-3 cursor-pointer py-2 px-3 rounded-lg transition-colors duration-200 ${pathname === "/main/profile"
                ? "bg-[#ecf3ff] text-blue-600"
                : "text-gray-700 hover:text-blue-600 hover:bg-[#ecf3ff]"
                }`}
            >
              <div className="flex items-center space-x-3">
                <Cog6ToothIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Setting</span>
              </div>
              <svg
                className={`transition-transform duration-200 w-4 h-4 ${selectedDropdown === "settings" ? "rotate-180" : "rotate-0"
                  }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
                stroke="currentColor"
              >
                <path d="M6 8l4 4 4-4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {selectedDropdown === "settings" && (
              <ul className="flex flex-col gap-1 mt-2 pl-9">
                <li>
                  <Link
                    href="/main/profile"
                    className={`block text-sm py-2.5 px-3 rounded transition ${pathname === "/main/profile"
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
