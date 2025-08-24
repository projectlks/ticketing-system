"use client";
import Aside from "@/components/Aside";
import TopBar from "@/components/TopBar";
import React, { useState } from "react";

export default function LayoutDiv({ children }: { children: React.ReactNode }) {
    const [openSidebar, setOpenSidebar] = useState<boolean>(false);

    return (
        <>


            <Aside openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />


            <div className="flex-1 flex flex-col overflow-hidden ">

                {/* <div :class="openSidebar ? 'block lg:hidden' : 'hidden'" class="fixed z-10 h-screen w-full bg-gray-900/50 block lg:hidden"></div> */}

                <div
                    className={`fixed z-10 h-screen w-full bg-gray-900/50 lg:hidden transition-opacity duration-300 ${openSidebar ? "block opacity-100 lg:hidden " : "hidden opacity-0"
                        }`}
                    onClick={() => setOpenSidebar(false)} // close sidebar when clicking overlay
                ></div>
                <TopBar openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />

                <div className="p-4 md:p-5 overflow-y-auto h-[calc(100%-76px)] overflow-x-auto bg-gray-100">
                    {children}
                </div>
            </div>
        </>
    );
}
