// import { Audit } from '../generated/prisma/client'
// import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
// import moment from 'moment'

// interface AuditLogItem extends Audit {
//     user?: {
//         id: string
//         name: string
//         email: string
//     }
// }

// export type AuditLogListProps = {
//     items?: AuditLogItem[]
//     className?: string
//     emptyText?: string
// }

// interface AuditChange {
//     field: string
//     oldValue: string
//     newValue: string
// }

// // Utility to safely parse the changes JSON from Prisma
// const parseChanges = (changes: unknown): AuditChange[] => {
//     if (!changes) return []

//     if (Array.isArray(changes)) {
//         return changes.filter(
//             (c): c is AuditChange =>
//                 typeof c === 'object' &&
//                 c !== null &&
//                 'field' in c &&
//                 'oldValue' in c &&
//                 'newValue' in c
//         )
//     }

//     if (typeof changes === 'string') {
//         try {
//             const parsed = JSON.parse(changes)
//             if (Array.isArray(parsed)) {
//                 return parsed.filter(
//                     (c): c is AuditChange =>
//                         typeof c === 'object' &&
//                         c !== null &&
//                         'field' in c &&
//                         'oldValue' in c &&
//                         'newValue' in c
//                 )
//             }
//         } catch {
//             return []
//         }
//     }

//     return []
// }

// export function AuditLogList({
//     items = [],
//     className = '',
//     emptyText = 'No audit log entries.',
// }: AuditLogListProps) {
//     if (!items.length) {
//         return (
//             <p className={`text-sm text-muted-foreground ${className}`}>
//                 {emptyText}
//             </p>
//         )
//     }

//     return (
//         <ul className={`relative space-y-4 pl-2 ${className}`} aria-label="Audit log">
//             {/* Vertical line */}
//             <div
//                 aria-hidden="true"
//                 className="absolute left-3.5 top-0 h-full border-l border-indigo-500 dark:border-indigo-400"
//             />

//             {items.map((item, idx) => {
//                 const key = item.id ?? `${idx}-${String(item.changedAt)}`
//                 const userInitial = item.user?.name
//                     ? item.user.name.charAt(0).toUpperCase()
//                     : '?'

//                 const changedAtISO =
//                     item.changedAt && !isNaN(new Date(item.changedAt).getTime())
//                         ? new Date(item.changedAt).toISOString()
//                         : undefined

//                 const changedAtText =
//                     item.changedAt && !isNaN(new Date(item.changedAt).getTime())
//                         ? moment(item.changedAt).fromNow()
//                         : 'Unknown time'

//                 const changes = parseChanges(item.changes)

//                 return (
//                     <li key={key} className="relative pl-8">
//                         {/* Circle marker */}
//                         <span
//                             aria-hidden="true"
//                             className="absolute left-0 top-1 inline-flex h-3.5 w-3.5 rounded-full bg-white dark:bg-gray-800 ring-4 ring-indigo-500 dark:ring-indigo-400"
//                         />

//                         {/* Audit entry card */}
//                         <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-card/60 dark:bg-gray-800 p-3 shadow-sm hover:bg-accent/40">
//                             <div className="flex justify-between items-center gap-3 text-xs text-muted-foreground dark:text-gray-400">
//                                 <div className="flex items-center gap-3">
//                                     <span className="flex items-center justify-center h-11 w-11 text-2xl text-white bg-blue-500 rounded-full select-none">
//                                         {userInitial}
//                                     </span>
//                                     <div className="flex flex-col text-sm font-medium">
//                                         <p>{item.user?.name ?? 'Loading...'}</p>
//                                         <p className="text-xs text-gray-600 dark:text-gray-400">
//                                             {item.user?.email ?? '—'}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <time dateTime={changedAtISO} className="text-xs text-gray-500 dark:text-gray-400">
//                                     {changedAtText}
//                                 </time>
//                             </div>

//                             {/* Audit entry message */}
//                             {item.action === 'CREATE' ? (
//                                 <p className="mt-2 text-sm leading-relaxed wrap-break-word">
//                                     Ticket created
//                                 </p>
//                             ) : changes.some(c => c.field === 'remark') ? (
//                                 <p className="mt-2 text-sm leading-relaxed wrap-break-word text-green-600">
//                                     Remark added:{' '}
//                                     <i className="text-indigo-500">
//                                         &quot;{changes.find(c => c.field === 'remark')?.newValue}&quot;
//                                     </i>
//                                 </p>
//                             ) : (
//                                 <div className="mt-2 text-sm ">
//                                     {/* Changed: */}
//                                     {changes.map((c, idx) => (



//                                         <div key={idx} className="flex items-start space-x-5 mt-3">

//                                             <span className="w-1.5 h-1.5 rounded-full mt-1.5 bg-main shrink-0"></span>


//                                             <span className='flex items-center space-x-3 flex-wrap'>

//                                                 <i className="text-gray-500">{c.oldValue}</i>
//                                                 <ArrowLongRightIcon className='text-gray-700 size-5 ' />
//                                                 <i className="text-indigo-500">{c.newValue}</i>

//                                                 <p className='italic'>
//                                                     (
//                                                     {c.field.endsWith('Id') ? c.field.slice(0, -2) : c.field}
//                                                     )
//                                                 </p>
//                                             </span>
//                                         </div>


//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     </li>
//                 )
//             })}
//         </ul>
//     )
// }

// export default AuditLogList



import { Audit } from "../generated/prisma/client";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import moment from "moment";

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

// Safely parse Prisma JSON field
const parseChanges = (changes: unknown): AuditChange[] => {
    if (!changes) return [];

    if (Array.isArray(changes)) {
        return changes.filter(
            (c): c is AuditChange =>
                typeof c === "object" &&
                c !== null &&
                "field" in c &&
                "oldValue" in c &&
                "newValue" in c
        );
    }

    if (typeof changes === "string") {
        try {
            const parsed = JSON.parse(changes);
            if (Array.isArray(parsed)) {
                return parsed.filter(
                    (c): c is AuditChange =>
                        typeof c === "object" &&
                        c !== null &&
                        "field" in c &&
                        "oldValue" in c &&
                        "newValue" in c
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
        return (
            <p className={`text-sm text-muted-foreground ${className}`}>
                {emptyText}
            </p>
        );
    }

    return (
        <ul className={`relative space-y-4 pl-2 ${className}`} aria-label="Audit log">
            {/* Vertical line */}
            <div
                aria-hidden="true"
                className="absolute left-3.5 top-0 h-full border-l border-indigo-500 dark:border-indigo-400"
            />

            {items.map((item, idx) => {
                const key = item.id ?? `${idx}-${String(item.changedAt)}`;
                const userInitial = item.user?.name?.charAt(0).toUpperCase() ?? "?";

                const changedAtISO =
                    item.changedAt && !isNaN(new Date(item.changedAt).getTime())
                        ? new Date(item.changedAt).toISOString()
                        : undefined;

                const changedAtText =
                    item.changedAt && !isNaN(new Date(item.changedAt).getTime())
                        ? moment(item.changedAt).fromNow()
                        : "Unknown time";

                const changes = parseChanges(item.changes);


                return (
                    <li key={key} className="relative pl-8">
                        {/* Blue dot */}
                        <span
                            aria-hidden="true"
                            className="absolute left-0 top-1 inline-flex h-3.5 w-3.5 rounded-full bg-white dark:bg-gray-800 ring-4 ring-indigo-500 dark:ring-indigo-400"
                        />

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-card/60 dark:bg-gray-800 p-3 shadow-sm hover:bg-accent/40">
                            {/* USER INFO */}
                            <div className="flex justify-between items-center gap-3 text-xs text-muted-foreground dark:text-gray-400">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center h-11 w-11 text-2xl text-white bg-blue-500 rounded-full select-none">
                                        {userInitial}
                                    </span>

                                    <div className="flex flex-col text-sm font-medium">
                                        <p>{item.user?.name ?? "Loading..."}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {item.user?.email ?? "—"}
                                        </p>
                                    </div>
                                </div>

                                <time
                                    dateTime={changedAtISO}
                                    className="text-xs text-gray-500 dark:text-gray-400"
                                >
                                    {changedAtText}
                                </time>
                            </div>

                            {/* CONTENT */}
                            {item.action === "CREATE" ? (
                                <p className="mt-2 text-sm leading-relaxed">Ticket created</p>
                            ) : (
                                <div className="mt-2 text-sm">
                                    {/* REMARK CHANGES */}

                                    {changes.map((c, idx) => (
                                        <div
                                            key={`change-${idx}`}
                                            className="flex items-start space-x-5 mt-3"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 bg-main shrink-0" />

                                            <span className="flex items-center space-x-3 flex-wrap">
                                                <i className="text-gray-500">{c.oldValue ? c.oldValue : "NONE "}</i>
                                                <ArrowLongRightIcon className="text-gray-700 size-5" />
                                                <i className="text-indigo-500">{c.newValue}</i>

                                                <p className="italic">
                                                    (
                                                    {c.field.endsWith("Id")
                                                        ? c.field.slice(0, -2)
                                                        : c.field}
                                                    )
                                                </p>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export default AuditLogList;
