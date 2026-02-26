"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import type { NavSection } from "./nav-config";
import { isItemActive } from "./nav-utils";
import { prefetchHelpdeskRouteData } from "../../queries/query-options";

type TopbarMobileNavProps = {
  open: boolean;
  sections: NavSection[];
  activeItemKey: string | null;
  onClose: () => void;
};

export default function TopbarMobileNav({
  open,
  sections,
  activeItemKey,
  onClose,
}: TopbarMobileNavProps) {
  const queryClient = useQueryClient();

  if (!open) return null;

  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-3 lg:hidden sm:px-6">
      {/* Mobile မှာ section group နဲ့ list ခွဲထားလို့
          menu item များလာတဲ့အချိန်တွင်လည်း scan/readability ကောင်းနေစေပါတယ်။ */}
      <nav className="space-y-3">
        {sections.map((section) => (
          <section key={`mobile-${section.key}`}>
            <p className="px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
              {section.label}
            </p>
            <div className="mt-1.5 space-y-1">
              {section.items.map((item) => {
                const active = isItemActive(activeItemKey, item.href, item.key);
                return (
                  <Link
                    key={`mobile-${item.key}`}
                    href={item.href}
                    prefetch
                    onMouseEnter={() =>
                      void prefetchHelpdeskRouteData(queryClient, item.href.pathname)
                    }
                    onFocus={() =>
                      void prefetchHelpdeskRouteData(queryClient, item.href.pathname)
                    }
                    onClick={onClose}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
