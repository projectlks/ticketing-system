"use client";

import { BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getSocket } from "@/libs/socket-client";

export default function SlaViolationNotification() {
  const [count, setCount] = useState(0);
  const hasViolations = count > 0;

  useEffect(() => {
    const socket = getSocket();

    const handleViolations = (payload?: { count?: number }) => {
      const nextCount =
        payload?.count && Number.isFinite(payload.count) ? payload.count : 0;
      if (nextCount <= 0) return;
      setCount((previous) => previous + nextCount);
    };

    socket.on("sla-violations", handleViolations);

    return () => {
      socket.off("sla-violations", handleViolations);
    };
  }, []);

  return (
    <Link
      href={{ pathname: "/helpdesk/tickets", query: { sla: "Violated" } }}
      onClick={() => setCount(0)}
      className="group  h-9 relative   text-xs font-semibold text-zinc-700 "
      aria-label={
        hasViolations ? `${count} new SLA violation(s)` : "SLA notifications"
      }>
      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-gray-500">
        <BellIcon className="size-5" aria-hidden="true" />
        {hasViolations && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        )}
      </span>
      {hasViolations && (
        <span className="rounded-full absolute -top-2 -right-2 bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
