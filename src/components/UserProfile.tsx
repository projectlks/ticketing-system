"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { signOut, useSession } from "next-auth/react";

import Avatar from "./Avatar";
import { useUserData } from "@/context/UserProfileContext";

export default function UserMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();
  const { userData } = useUserData();

  const displayName = userData?.name || session?.user?.name || "Loading...";
  const displayEmail = userData?.email || session?.user?.email || "Loading...";
  const displayProfileUrl = userData?.profileUrl || session?.user?.image || null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) return null;

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((previous) => !previous)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-50"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
      >
        <span className="relative h-8 w-8 overflow-hidden rounded-full border border-zinc-200">
          <Avatar name={displayName} profileUrl={displayProfileUrl} size={32} />
        </span>
        <span className="hidden text-sm font-medium sm:inline-block">{displayName}</span>
        <ChevronDownIcon className="hidden h-4 w-4 text-zinc-400 sm:inline-block" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,280px)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            <p className="text-sm font-medium text-zinc-800">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{displayEmail}</p>
          </div>

          <div className="mt-3 space-y-1">
            {/* <button
              type="button"
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit profile
            </button> */}

            <button
              type="button"
              disabled={
                !(userData?.id || session?.user?.id) ||
                !(userData?.email || session?.user?.email)
              }
              onClick={async () => {
                try {
                  await signOut({ redirect: true, callbackUrl: "/auth/signin" });
                } catch {
                  alert("Logout failed. Please try again.");
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
