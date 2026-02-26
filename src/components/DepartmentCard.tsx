import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import type { DepartmentTicketStats } from "@/app/helpdesk/department/page";

import DepartmentMetricLink from "./department-card/DepartmentMetricLink";

type DepartmentCardProps = {
  dept: DepartmentTicketStats;
};

const normalizePhoneForTel = (value: string) => value.replace(/[^\d+]/g, "");

const buildTicketHref = (
  departmentId: string,
  departmentName: string,
  preset:
    | "active"
    | "urgent"
    | "unassigned"
    | "resolved"
    | "new"
    | "open"
    | "closed",
  query: Record<string, string>,
) => ({
  pathname: "/helpdesk/tickets",
  query: {
    source: "department",
    preset,
    departmentId,
    departmentName,
    ...query,
  },
});

type TopStatBadgeProps = {
  label: string;
  value: number;
  href: {
    pathname: string;
    query: Record<string, string>;
  };
};

function TopStatBadge({ label, value, href }: TopStatBadgeProps) {
  return (
    <Link
      href={href}
      // Quick stat chip ကို click လုပ်လို့ရအောင်ထားတာကြောင့် user က card အောက်ထိမဆင်းဘဲ
      // first glance KPI ကနေတန်း drill-down ဝင်နိုင်ပြီး action time ပိုတိုစေပါတယ်။
      className="group/stat rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 transition-colors hover:bg-zinc-100">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
    </Link>
  );
}

export default function DepartmentCard({ dept }: DepartmentCardProps) {
  const activeTotal = dept.count.new + dept.count.open;
  const email = dept.email?.trim() || "";
  const contact = dept.contact?.trim() || "";
  const telTarget = contact ? normalizePhoneForTel(contact) : "";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
      {/* Card အတွင်း visual depth ကို subtle blur accent တစ်ချက်ပဲထည့်ထားလို့
          color မများဘဲ flat feeling ကိုလျော့ပြီး modern card look ရစေပါတယ်။ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-zinc-100 blur-2xl"
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
            <h3 className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              {dept.name}
            </h3>
          </div>

          <div className="mt-2 space-x-2">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex max-w-full items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-800 hover:underline"
              >
                <EnvelopeIcon
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{email}</span>
              </a>
            ) : (
              <p className="inline-flex max-w-full items-center gap-1.5 text-xs text-zinc-500">
                <EnvelopeIcon
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">No email address</span>
              </p>
            )}

            {telTarget ? (
              // Phone link ကို tel: scheme နဲ့ထုတ်ထားလို့ mobile မှာ direct call app ဖွင့်ပြီး
              // desktop မှာလည်း supported dialer app ကိုတန်းခေါ်နိုင်ပါတယ်။
              <a
                href={`tel:${telTarget}`}
                className="inline-flex max-w-full items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-800 hover:underline"
              >
                <PhoneIcon
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{contact}</span>
              </a>
            ) : (
              <p className="inline-flex max-w-full items-center gap-1.5 text-xs text-zinc-500">
                <PhoneIcon
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">No contact number</span>
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
          Active {activeTotal}
        </div>
      </header>

      <section className="mt-4 grid grid-cols-3 gap-2">
        <TopStatBadge
          label="New"
          value={dept.count.new}
          href={buildTicketHref(dept.id, dept.name, "new", { status: "NEW" })}
        />
        <TopStatBadge
          label="Open"
          value={dept.count.open}
          href={buildTicketHref(dept.id, dept.name, "open", {
            status: "OPEN,IN_PROGRESS",
          })}
        />
        <TopStatBadge
          label="Closed"
          value={dept.count.closed}
          href={buildTicketHref(dept.id, dept.name, "closed", {
            status: "CLOSED,RESOLVED,CANCELED",
          })}
        />
      </section>

      {/* Metric tiles တွေကို action entry point အဖြစ်ထားပြီး user က count ကိုကြည့်တာနဲ့တပြိုင်နက်
          filtered tickets list ထဲတန်းဝင်နိုင်အောင် card-to-table flow ကိုတိုချုံးထားပါတယ်။ */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <DepartmentMetricLink
          label="Active Queue"
          value={activeTotal}
          helper="NEW + OPEN + IN_PROGRESS"
          tone="primary"
          href={buildTicketHref(dept.id, dept.name, "active", {
            status: "NEW,OPEN,IN_PROGRESS",
          })}
        />

        <DepartmentMetricLink
          label="Urgent"
          value={dept.count.urgent}
          helper="Critical active"
          href={buildTicketHref(dept.id, dept.name, "urgent", {
            priority: "CRITICAL",
            status: "NEW,OPEN,IN_PROGRESS",
          })}
        />

        <DepartmentMetricLink
          label="Unassigned"
          value={dept.count.unassigned}
          helper="No owner"
          href={buildTicketHref(dept.id, dept.name, "unassigned", {
            ownership: "Unassigned",
          })}
        />

        <DepartmentMetricLink
          label="Resolved"
          value={dept.count.closed}
          helper="Closed set"
          href={buildTicketHref(dept.id, dept.name, "resolved", {
            status: "CLOSED,RESOLVED,CANCELED",
          })}
        />
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={{ pathname: "/helpdesk/tickets/new", query: { filter: dept.id } }}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700">
          Create Ticket
        </Link>

        <Link
          href={buildTicketHref(dept.id, dept.name, "active", {
            status: "NEW,OPEN,IN_PROGRESS",
          })}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
          View Queue
        </Link>
      </footer>
    </article>
  );
}
