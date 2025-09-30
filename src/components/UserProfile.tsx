"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  PencilSquareIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { signOut, useSession } from "next-auth/react";
import Avatar from "./Avatar";
import { usePathname, useRouter } from "next/navigation";
import { useUserData } from "@/context/UserProfileContext";
import { deleteUserSession } from "@/libs/action";
import LanguageSwitcher from "./LanguageSwitch";
import ThemeToggle from "@/app/ThemeToggle";

type Props = {
  menuToggle: boolean;
  setMenuToggle: (val: boolean) => void;
};

export default function UserMenu({ menuToggle }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();
  const { userData } = useUserData();

  const displayName = userData?.name || session?.user?.name || "Loading...";
  const displayEmail = userData?.email || session?.user?.email || "Loading...";
  const displayProfileUrl = userData?.profileUrl || session?.user?.image || null;

  const router = useRouter();
  const pathname = usePathname();

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

  const segments = pathname.split("/");
  const locale = segments[2] || "en";

  return (
    <div
      className={`${menuToggle ? "flex" : "hidden"} flex-col lg:flex lg:flex-row items-center justify-between w-full gap-4 px-5 py-4 shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
    >
      <ThemeToggle />
      <LanguageSwitcher />

      {/* User profile dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center text-gray-700 dark:text-gray-200 focus:outline-none"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          <span className="relative mr-3 overflow-hidden rounded-full h-11 w-11">
            <Avatar name={displayName} profileUrl={displayProfileUrl} />
          </span>
          <span className="hidden mr-1 text-sm font-medium sm:inline-block">{displayName}</span>
          <ChevronDownIcon aria-hidden="true" className="hidden w-5 h-5 stroke-gray-500 dark:stroke-gray-300 sm:inline-block" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-4 w-[260px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg z-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">{displayName}</span>
              <span className="block text-xs text-gray-500 mt-0.5 dark:text-gray-400">{displayEmail}</span>
            </div>

            <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <li
                onClick={() => {
                  setDropdownOpen(false);
                  router.push(`/lang/${locale}/main/profile`);
                }}
              >
                <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg group hover:bg-gray-100 w-full dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
                  <PencilSquareIcon className="w-6 h-6" />
                  Edit profile
                </button>
              </li>
            </ul>

            <button
              disabled={!(userData?.id || session?.user?.id) || !(userData?.email || session?.user?.email)}
              onClick={async () => {
                try {
                  const success = await deleteUserSession(session.user.id);
                  if (!success) {
                    alert("Logout failed. Please try again.");
                    return;
                  }
                  // await signOut({ redirect: false });
                  await signOut({ redirect: true, callbackUrl: "/auth/signin" });

                  // router.push("/auth/signin");p
                } catch (error) {
                  console.error("Failed to sign out:", error);
                  alert("Logout failed. Please try again.");
                }
              }}
              className="flex items-center justify-center w-full gap-3 px-3 py-2 mt-3 text-sm font-medium text-gray-700 rounded-lg group hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
