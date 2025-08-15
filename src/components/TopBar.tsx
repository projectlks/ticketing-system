"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { Bars3Icon, SpeakerWaveIcon } from "@heroicons/react/24/outline"; // or /solid
import UserProfile from "./UserProfile";
import Image from "next/image";

interface Props {
    openSidebar: boolean
    setOpenSidebar: Dispatch<SetStateAction<boolean>>


}

export default function TopBar({ setOpenSidebar, openSidebar }: Props) {
    const [menuToggle, setMenuToggle] = useState(false);






    return (
        <div className="w-full h-19 bg-white border-b border-gray-200 ">


            <div className="flex justify-between lg:flex-row flex-col h-full items-center lg:px-6">
                {/* menu btn */}


                {/* left side */}
                <div className="flex w-full  items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenSidebar(!openSidebar);
                        }}
                        className="flex items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg  hover:bg-gray-100 lg:h-11 lg:w-11 lg:border"
                        aria-label="Toggle Sidebar"
                    >
                        <Bars3Icon className="w-6 h-6 lg:block" />
                    </button>

                    {/* logo */}
                    <div className="flex items-center space-x-3 lg:hidden">
                        <Image src="/logo.png" alt="logo" className="w-8 h-8" width={32} height={32} />
                        <h1 className="text-2xl font-bold text-gray-800">East Wind</h1>
                    </div>

                    {/* Application nav menu button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuToggle(!menuToggle);
                        }}
                        className={`flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-[99999] hover:bg-gray-100 lg:hidden ${menuToggle ? "bg-gray-100" : ""
                            }`}
                        aria-label="Toggle Menu"
                    >
                        <SpeakerWaveIcon className="w-6 h-6 fill-current" />
                    </button>
                </div>

                {/* right side user menu */}
                <UserProfile
                    menuToggle={menuToggle}
                    setMenuToggle={setMenuToggle}
                />
            </div>
        </div>
    );
}
