"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { NavSection } from "./nav-config";
import { isItemActive, isSectionActive } from "./nav-utils";
import { prefetchHelpdeskRouteData } from "../../queries/query-options";

type TopbarDesktopNavProps = {
  sections: NavSection[];
  activeItemKey: string | null;
};

export default function TopbarDesktopNav({
  sections,
  activeItemKey,
}: TopbarDesktopNavProps) {
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenSectionKey(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSectionKey(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleSection = (sectionKey: string) => {
    // Single state key ???????????????????? ??????????????? dropdown ??????????????????
    setOpenSectionKey((previousKey) =>
      previousKey === sectionKey ? null : sectionKey,
    );
  };

  const handleLinkPrefetch = (pathname: string) => {
    // Route hover/focus ပေါ်လာတုန်း data warm-up လုပ်ထားလို့ page ပြောင်းချိန် wait time နည်းသွားပါတယ်။
    void prefetchHelpdeskRouteData(queryClient, pathname);
  };

  return (
    <nav
      ref={navRef}
      className="hidden min-w-0 flex-1 items-center gap-1  lg:flex">
      {sections.map((section) => {
        if (section.items.length === 1) {
          const item = section.items[0];
          const active = isItemActive(activeItemKey, item.href, item.key);

          return (
            <Link
              key={section.key}
              href={item.href}
              prefetch
              onMouseEnter={() => handleLinkPrefetch(item.href.pathname)}
              onFocus={() => handleLinkPrefetch(item.href.pathname)}
              onClick={() => setOpenSectionKey(null)}
              className={`inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              }`}>
              {item.label}
            </Link>
          );
        }

        const sectionActive = isSectionActive(activeItemKey, section);
        const sectionOpen = openSectionKey === section.key;

        return (
          <div key={section.key} className="relative shrink-0">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sectionOpen}
              onClick={() => toggleSection(section.key)}
              className={`flex h-9 items-center gap-1 rounded-lg px-3 text-sm transition-colors ${
                sectionActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              }`}>
              {section.label}
              <ChevronDownIcon
                className={`h-3.5 w-3.5 transition-transform ${
                  sectionOpen ? "rotate-180" : ""
                } ${sectionActive ? "text-white" : "text-zinc-400"}`}
              />
            </button>

            {sectionOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[180px] rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg">
                {/* Dropdown item ?????????? click ?????????? close ???????????
                    route ???????????????? panel ??????? ???????????????????????? */}
                {section.items.map((item) => {
                  const active = isItemActive(activeItemKey, item.href, item.key);

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      prefetch
                      onMouseEnter={() => handleLinkPrefetch(item.href.pathname)}
                      onFocus={() => handleLinkPrefetch(item.href.pathname)}
                      onClick={() => setOpenSectionKey(null)}
                      className={`block rounded-md px-2.5 py-2 text-sm transition-colors ${
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
