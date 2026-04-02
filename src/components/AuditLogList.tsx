import { useEffect, useState } from "react";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import { formatMyanmarDateTime } from "@/libs/myanmar-date-time";

import { Audit } from "../generated/prisma/client";
import Avatar from "./Avatar";

interface AuditLogItem extends Audit {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export type AuditLogListProps = {
  items?: AuditLogItem[];
  className?: string;
  emptyText?: string;
};

interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}

const formatRelativeTime = (value: Date | string | number): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 45) return "just now";
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} min ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hr ago`;
  }

  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const parseChanges = (changes: unknown): AuditChange[] => {
  if (!changes) return [];

  if (Array.isArray(changes)) {
    return changes.filter(
      (change): change is AuditChange =>
        typeof change === "object" &&
        change !== null &&
        "field" in change &&
        "oldValue" in change &&
        "newValue" in change,
    );
  }

  if (typeof changes === "string") {
    try {
      const parsed = JSON.parse(changes);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (change): change is AuditChange =>
            typeof change === "object" &&
            change !== null &&
            "field" in change &&
            "oldValue" in change &&
            "newValue" in change,
        );
      }
    } catch {
      return [];
    }
  }

  return [];
};

export function AuditLogList({
  items = [],
  className = "",
  emptyText = "No audit log entries.",
}: AuditLogListProps) {
  const [, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (!items.length) {
    return <p className={`text-sm text-zinc-500 ${className}`}>{emptyText}</p>;
  }

  return (
    <ul
      className={`relative space-y-4 pl-2 ${className}`}
      aria-label="Audit log">
      <div
        aria-hidden="true"
        className="absolute left-3.5 top-0 h-full border-l border-zinc-200"
      />

      {items.map((item, idx) => {
        const key = item.id ?? `${idx}-${String(item.changedAt)}`;

        const changedAtISO =
          item.changedAt && !Number.isNaN(new Date(item.changedAt).getTime())
            ? new Date(item.changedAt).toISOString()
            : undefined;

        const changedAtText =
          item.changedAt && !Number.isNaN(new Date(item.changedAt).getTime())
            ? formatMyanmarDateTime(item.changedAt)
            : "Unknown time";
        const changedAtRelative =
          item.changedAt && !Number.isNaN(new Date(item.changedAt).getTime())
            ? formatRelativeTime(item.changedAt)
            : "Unknown time";

        const changes = parseChanges(item.changes);
        const automationSource =
          changes.find((change) => change.field === "source" && change.newValue)
            ?.newValue ?? "";
        const isAutomated =
          Boolean(automationSource) || (!item.user?.name && !item.user?.email);
        const visibleChanges = changes.filter(
          (change) => change.field !== "source",
        );

        const actorName = item.user?.name ?? (isAutomated ? "Automation" : "Unknown");
        const actorEmail = item.user?.email ?? (automationSource || "-");
        const createdText = isAutomated
          ? `Ticket created (Automated${automationSource ? `: ${automationSource}` : ""})`
          : "Ticket created";
        const updatedText = isAutomated
          ? `Ticket updated (Automated${automationSource ? `: ${automationSource}` : ""})`
          : "Ticket updated";

        return (
          <li key={key} className="relative pl-8">
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 inline-flex h-3.5 w-3.5 rounded-full bg-white ring-4 ring-zinc-300"
            />

            <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-xs">
              <div className="flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                    <Avatar name={item.user?.name} />
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-800">{actorName}</p>
                      {isAutomated && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="min-w-0 break-all text-xs text-zinc-500">
                      {actorEmail}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-start text-right sm:pl-2">
                  <time
                    dateTime={changedAtISO}
                    className="block text-xs font-medium text-zinc-700">
                    {changedAtRelative}
                  </time>
                  <time
                    dateTime={changedAtISO}
                    className="block text-[11px] text-zinc-500">
                    {changedAtText}
                  </time>
                </div>
              </div>

              {item.action === "CREATE" ? (
                <p className="mt-2 text-sm text-zinc-700">{createdText}</p>
              ) : (
                <div className="mt-2 space-y-2  overflow-hidden text-sm">
                  {visibleChanges.length === 0 ? (
                    <p className="text-sm text-zinc-700">{updatedText}</p>
                  ) : (
                    visibleChanges.map((change, changeIndex) => (
                      <div
                        key={`change-${changeIndex}`}
                        className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />

                        <span className="flex flex-wrap items-center gap-2 text-zinc-700">
                          <i className="text-zinc-500 ">
                            {change.oldValue ? change.oldValue : "NONE"}
                          </i>
                          <ArrowLongRightIcon className="size-4 text-zinc-500" />
                          <i className="text-zinc-900 ">{change.newValue}</i>
                          <p className="italic text-zinc-500 ">
                            (
                            {change.field.endsWith("Id")
                              ? change.field.slice(0, -2)
                              : change.field}
                            )
                          </p>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export default AuditLogList;
