import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  PencilSquareIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { signOut, useSession } from "next-auth/react";
import Avatar from "./Avatar";
import { useRouter } from "next/navigation";
// import { useRouter } from "next/";

type Props = {
  menuToggle: boolean;
  setMenuToggle: (val: boolean) => void;
};

export default function UserMenu({ menuToggle }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession(); // ✅ Correct way for client components

  // close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const router = useRouter()

  return (
    <div
      className={`${menuToggle ? "flex" : "hidden"
        } flex-col lg:flex lg:flex-row items-center justify-between w-full gap-4 px-5 py-4 shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
    >
      {/* User profile dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center text-gray-700 focus:outline-none"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          <span className="relative mr-3 overflow-hidden rounded-full h-11 w-11">
            {/* <span className="flex items-center justify-center w-full h-full text-2xl text-gray-100 bg-blue-500 rounded-full z-10 select-none">
              {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
            </span> */}

            <Avatar name={session?.user?.name} profileUrl={session?.user.image} />
          </span>
          <span className="hidden mr-1 text-sm font-medium sm:inline-block">
            {session?.user?.name ?? "Loading..."}
          </span>
          <ChevronDownIcon className="hidden w-5 h-5 stroke-gray-500 sm:inline-block" />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-4 w-[260px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg z-50">
            <div>
              <span className="block text-sm font-medium text-gray-700">
                {session?.user?.name}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                {session?.user?.email}
              </span>
            </div>
            <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200">
              <li           onClick={() =>{   setDropdownOpen(false); router.push("/main/profile")}}>
                <button
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg group hover:bg-gray-100 w-full"
                >
                  <PencilSquareIcon className="w-6 h-6" />
                  Edit profile
                </button>
              </li>
            </ul>
            <button
              onClick={() =>{ signOut(); router.push("/auth/signin")}}
              className="flex items-center justify-center w-full gap-3 px-3 py-2 mt-3 text-sm font-medium text-gray-700 rounded-lg group hover:bg-gray-100"
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
