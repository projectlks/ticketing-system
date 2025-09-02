import { Audit } from '@prisma/client'
import moment from 'moment'

interface AuditLogItem extends Audit {
  user?: {
    id: string
    name: string
    email: string
  }
}

export type AuditLogListProps = {
  items?: AuditLogItem[]
  className?: string
  emptyText?: string
}

export function AuditLogList({
  items = [],
  className = '',
  emptyText = 'No audit log entries.',
}: AuditLogListProps) {
  if (!items.length) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        {emptyText}
      </p>
    )
  }

  return (
<ul
  className={`relative space-y-4 pl-2 ${className}`}
  aria-label="Audit log"
>
  {/* Vertical line */}
  <div
    aria-hidden="true"
    className="absolute left-[14px] top-0 h-full border-l border-indigo-500 dark:border-indigo-400"
  />

  {items.map((item, idx) => {
    const key = item.id ?? `${idx}-${String(item.changedAt)}`;

    const userInitial = item.user?.name
      ? item.user.name.charAt(0).toUpperCase()
      : '?';

    const changedAtISO =
      item.changedAt && !isNaN(new Date(item.changedAt).getTime())
        ? new Date(item.changedAt).toISOString()
        : undefined;

    const changedAtText =
      item.changedAt && !isNaN(new Date(item.changedAt).getTime())
        ? moment(item.changedAt).fromNow()
        : 'Unknown time';

    return (
      <li key={key} className="relative pl-8">
        {/* Circle marker */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-1 inline-flex h-3.5 w-3.5 rounded-full bg-white dark:bg-gray-800 ring-4 ring-indigo-500 dark:ring-indigo-400"
        />

        {/* Audit entry card */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-card/60 dark:bg-gray-800 p-3 shadow-sm  hover:bg-accent/40">
          <div className="flex justify-between items-center gap-3 text-xs text-muted-foreground dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center h-11 w-11 text-2xl text-white bg-blue-500 rounded-full select-none">
                {userInitial}
              </span>
              <div className="flex flex-col text-sm font-medium">
                <p>{item.user?.name ?? 'Loading...'}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.user?.email ?? '—'}
                </p>
              </div>
            </div>
            <time dateTime={changedAtISO} className="text-xs text-gray-500 dark:text-gray-400">
              {changedAtText}
            </time>
          </div>

          <p className="mt-2 text-sm leading-relaxed break-words">
            Changed <b className="text-indigo-500 uppercase">{item.field}</b> from{' '}
            <i className="text-indigo-500">&quot;{item.oldValue}&quot;</i> to{' '}
            <i className="text-indigo-500">&quot;{item.newValue}&quot;</i>
          </p>
        </div>
      </li>
    );
  })}
</ul>

  )
}

export default AuditLogList
