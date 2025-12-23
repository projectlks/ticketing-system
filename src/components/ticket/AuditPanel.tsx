"use client";

import AuditLogList from "@/components/AuditLogList";
import { Audit } from "@/generated/prisma/client";

export default function AuditPanel({ logs }: { logs: Audit[] }) {
  return (
    <div className="border-l-4 w-1/3 border-indigo-300 bg-white shadow-sm rounded-lg">
      <div className="pb-4 px-6 pt-6">
        <h2 className="text-lg font-semibold">History Logs</h2>
        <p className="text-sm text-gray-500">Recent changes</p>
      </div>
      <div className="px-6 pb-6">
        <AuditLogList items={logs} />
      </div>
    </div>
  );
}
