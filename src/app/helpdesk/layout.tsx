"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";

import UserProfile from "@/components/UserProfile";

import { navSections } from "./components/layout/nav-config";
import {
  getActiveLabel,
  getActiveNavItemKey,
  getVisibleSections,
} from "./components/layout/nav-utils";
import TopbarDesktopNav from "./components/layout/TopbarDesktopNav";
import TopbarMobileNav from "./components/layout/TopbarMobileNav";
import { prefetchHelpdeskRouteData } from "./queries/query-options";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const queryClient = useQueryClient();

  const canAccessConfiguration =
    session?.user.role === "SUPER_ADMIN" || session?.user.role === "ADMIN";

  const visibleSections = useMemo(
    () => getVisibleSections(navSections, canAccessConfiguration),
    [canAccessConfiguration],
  );

  // pathname + query ကို score-based match လုပ်ထားလို့
  // nav items အများကြီးတစ်ပြိုင်နက် active ဖြစ်နေတဲ့ပြဿနာကိုဖယ်ရှားထားပါတယ်။
  const activeItemKey = useMemo(
    () => getActiveNavItemKey(pathname, searchParams, visibleSections),
    [pathname, searchParams, visibleSections],
  );

  const activeLabel = useMemo(
    () => getActiveLabel(activeItemKey, visibleSections),
    [activeItemKey, visibleSections],
  );

  useEffect(() => {
    // Helpdesk module ထဲဝင်ချိန်တစ်ခါတည်း core pages query cache ကို warm-up လုပ်ထားလို့
    // section တစ်ခုကနေတစ်ခုသို့ပြောင်းချိန်မှာ first-load latency လျော့စေပါတယ်။
    const targetRoutes = [
      "/helpdesk",
      "/helpdesk/tickets",
      "/helpdesk/alerts",
      "/helpdesk/analysis",
      "/helpdesk/category",
      "/helpdesk/department",
      "/helpdesk/user",
    ] as const;

    void Promise.all(
      targetRoutes.map((route) =>
        prefetchHelpdeskRouteData(queryClient, route),
      ),
    );
  }, [queryClient]);

  return (
    <section className="min-h-screen w-full bg-[#F8FAFC] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[1600px]  overflow-visible px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((previous) => !previous)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 lg:hidden"
              aria-label="Toggle Menu"
              aria-expanded={mobileNavOpen}>
              {mobileNavOpen ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>

            <Link
              href={{ pathname: "/helpdesk" }}
              onClick={() => setMobileNavOpen(false)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-1 py-1">
              <span className="inline-flex h-7 items-center rounded-md border border-zinc-300 bg-white px-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                HD
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-zinc-900">
                  Helpdesk
                </p>
                <p className="text-[11px] text-zinc-500 lg:hidden">
                  {activeLabel}
                </p>
              </div>
            </Link>

            <TopbarDesktopNav
              sections={visibleSections}
              activeItemKey={activeItemKey}
            />

            <div className="ml-auto shrink-0">
              <UserProfile />
            </div>
          </div>
        </div>

        <TopbarMobileNav
          open={mobileNavOpen}
          sections={visibleSections}
          activeItemKey={activeItemKey}
          onClose={() => setMobileNavOpen(false)}
        />
      </header>

      <main className="w-full relative">{children}</main>
    </section>
  );
}
