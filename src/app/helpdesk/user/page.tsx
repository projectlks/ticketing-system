"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import UserDetailPanel from "./components/UserDetailPanel";
import UserQuickListItem from "./components/UserQuickListItem";
import UserToolbar from "./components/UserToolbar";
import { usersQueryOptions } from "../queries/query-options";
import type { TicketStats, UserTicketStatus } from "./types";

const sumStatus = (value: UserTicketStatus) =>
  value.new + value.open + value.inprogress + value.closed;

export default function UserPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const usersQuery = useQuery(usersQueryOptions());
  const users = useMemo(
    () => ((usersQuery.data ?? []) as TicketStats[]),
    [usersQuery.data],
  );

  const filteredUsers = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword),
    );
  }, [users, searchQuery]);

  const resolvedSelectedUserId = useMemo(() => {
    if (!filteredUsers.length) return null;
    if (selectedUserId && filteredUsers.some((user) => user.id === selectedUserId)) {
      return selectedUserId;
    }

    return filteredUsers[0].id;
  }, [filteredUsers, selectedUserId]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.id === resolvedSelectedUserId) ?? null,
    [filteredUsers, resolvedSelectedUserId],
  );

  const summary = useMemo(() => {
    return filteredUsers.reduce(
      (accumulator, user) => {
        accumulator.totalAssigned += sumStatus(user.assigned);
        accumulator.totalOpened += sumStatus(user.created);
        return accumulator;
      },
      { totalAssigned: 0, totalOpened: 0 },
    );
  }, [filteredUsers]);

  const isLoading = usersQuery.isLoading;
  const errorMessage = usersQuery.error
    ? usersQuery.error instanceof Error
      ? usersQuery.error.message
      : "Failed to load users."
    : null;
  const lastUpdatedAt = usersQuery.dataUpdatedAt
    ? new Date(usersQuery.dataUpdatedAt).toLocaleString()
    : "";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <UserToolbar
        searchQuery={searchQuery}
        shownCount={filteredUsers.length}
        totalAssigned={summary.totalAssigned}
        totalOpened={summary.totalOpened}
        totalLoad={summary.totalAssigned + summary.totalOpened}
        isLoading={isLoading}
        lastUpdatedAt={lastUpdatedAt}
        activeUserName={selectedUser?.name ?? null}
        onSearchChange={setSearchQuery}
        onCreateUser={() => router.push("/helpdesk/user/new")}
      />

      <main className="mx-auto w-full max-w-7xl space-y-3 px-4 py-4 sm:px-6 sm:py-5">
        {usersQuery.isFetching && !isLoading && (
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
            Syncing users...
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
            Loading users...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && filteredUsers.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
            No users matched your search.
          </div>
        )}

        {!isLoading && !errorMessage && filteredUsers.length > 0 && (
          <section className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Team List
                </p>
              </div>
              <div className="max-h-[65vh] divide-y divide-zinc-200 overflow-y-auto p-2">
                {filteredUsers.map((user) => (
                  <UserQuickListItem
                    key={user.id}
                    user={user}
                    isActive={user.id === resolvedSelectedUserId}
                    onSelect={() => setSelectedUserId(user.id)}
                  />
                ))}
              </div>
            </aside>

            <UserDetailPanel
              user={selectedUser}
              onOpenProfile={(id) => router.push(`/helpdesk/user/${id}`)}
            />
          </section>
        )}
      </main>
    </div>
  );
}
