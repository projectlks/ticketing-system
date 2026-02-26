import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import moment from "moment";

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
  if (!items.length) {
    return <p className={`text-sm text-zinc-500 ${className}`}>{emptyText}</p>;
  }

  return (
    <ul className={`relative space-y-4 pl-2 ${className}`} aria-label="Audit log">
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
            ? moment(item.changedAt).fromNow()
            : "Unknown time";

        const changes = parseChanges(item.changes);

        return (
          <li key={key} className="relative pl-8">
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 inline-flex h-3.5 w-3.5 rounded-full bg-white ring-4 ring-zinc-300"
            />

            <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                    <Avatar name={item.user?.name} />
                  </div>

                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-zinc-800">
                      {item.user?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-zinc-500">{item.user?.email ?? "-"}</p>
                  </div>
                </div>

                <time dateTime={changedAtISO} className="text-xs text-zinc-500">
                  {changedAtText}
                </time>
              </div>

              {item.action === "CREATE" ? (
                <p className="mt-2 text-sm text-zinc-700">Ticket created</p>
              ) : (
                <div className="mt-2 space-y-2 text-sm">
                  {changes.map((change, changeIndex) => (
                    <div key={`change-${changeIndex}`} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />

                      <span className="flex flex-wrap items-center gap-2 text-zinc-700">
                        <i className="text-zinc-500">
                          {change.oldValue ? change.oldValue : "NONE"}
                        </i>
                        <ArrowLongRightIcon className="size-4 text-zinc-500" />
                        <i className="text-zinc-900">{change.newValue}</i>
                        <p className="italic text-zinc-500">
                          (
                          {change.field.endsWith("Id")
                            ? change.field.slice(0, -2)
                            : change.field}
                          )
                        </p>
                      </span>
                    </div>
                  ))}
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
