"use client";

import { Audit } from "@/generated/prisma/client";

import AuditLogList from "@/components/AuditLogList";

export default function AuditPanel({ logs }: { logs: Audit[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
      <header className="mb-4 border-b border-zinc-100 pb-3">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          Activity
        </h2>
        <p className="text-xs text-zinc-500">Latest ticket change history</p>
      </header>
      <AuditLogList items={logs} emptyText="No update history yet." />
    </section>
  );
}
