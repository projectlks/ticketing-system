"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";
import { useSession } from "next-auth/react";

type DropdownItem = {
  label: string;
  href: { pathname: string; query?: Record<string, string> };
};

type MenuItem = {
  label: string;
  href?: { pathname: string; query?: Record<string, string> };
  dropdown?: DropdownItem[];
};

const menuItems: MenuItem[] = [
  { label: "Overview", href: { pathname: "/helpdesk" } },
  {
    label: "Tickets",
    dropdown: [
      { label: "My Tickets", href: { pathname: "/helpdesk/tickets", query: { filter: "My Tickets" } } },
      { label: "All Tickets", href: { pathname: "/helpdesk/tickets" } },
    ],
  },
  {
    label: "Alerts",
    dropdown: [
      { label: "Current Alerts", href: { pathname: "/helpdesk/alerts", } },
      { label: "All Alerts", href: { pathname: "/helpdesk/alerts", query: { filter: "All Alerts" } } },
    ],
  },
  { label: "Reporting", href: { pathname: "/helpdesk/analysis" } },
  {
    label: "Configuration",
    dropdown: [
      { label: "Departments", href: { pathname: "/helpdesk/department" } },
      { label: "Categories", href: { pathname: "/helpdesk/category" } },
      { label: "User", href: { pathname: "/helpdesk/user" } },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {



  const { data } = useSession();

  return (
    <section className="w-full h-screen bg-[#f5f5f5]">
      {/* Top Bar */}
      <div className="flex items-center border-b border-gray-300 bg-white px-3 py-3 space-x-3">
        {/* Logo */}
        <span className="block h-[30px] aspect-square rounded-full">
          <Image src="/download.png" alt="Helpdesk" width={30} height={30} />
        </span>

        <Link href={{ pathname: "/helpdesk" }}>
          <h3>Helpdesk</h3>
        </Link>

        {/* Menu */}
        <ul className="flex items-center space-x-1 text-xs">
          {menuItems.map((item) =>



            item.dropdown ? (
              <li key={item.label} className="relative group cursor-pointer px-2 py-1 rounded hover:bg-gray-300">
                {/* <span>{data?.user.role === "superadmin" ? item.label : ""}</span> */}
                <span>
                  {item.label === "Configuration"
                    ? data?.user.role === "SUPER_ADMIN" || data?.user.role === "ADMIN"
                      ? item.label
                      : ""
                    : item.label}
                </span>
                {/* Dropdown */}
                <div className="absolute left-0 top-[calc(100%+5px)] z-50 w-[140px] rounded border border-gray-300 bg-white p-1 text-[10px] opacity-0 invisible transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  {item.dropdown.map((drop, index) => (
                    <Link key={index} href={drop.href}>
                      <p className="px-2 py-1 rounded hover:bg-gray-100">{drop.label}</p>
                    </Link>
                  ))}
                </div>
              </li>
            ) : (
              <li key={item.label} className="cursor-pointer px-2 py-1 rounded hover:bg-gray-300">
                <Link href={item.href!}>{item.label}</Link>
              </li>
            )



          )}
        </ul>

        {/* User Profile */}
        <div className="flex-1 pr-5">
          <UserProfile />
        </div>
      </div>

      {/* Page Content */}
      {children}
    </section>
  );
}
