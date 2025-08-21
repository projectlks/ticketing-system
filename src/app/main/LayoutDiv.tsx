"use client";
import Aside from "@/components/Aside";
import TopBar from "@/components/TopBar";
import React, { useState } from "react";

export default function LayoutDiv({ children }: { children: React.ReactNode }) {
    const [openSidebar, setOpenSidebar] = useState<boolean>(true);

    return (
        <>
            <div className={`sidebar fixed top-0 left-0 border-r border-gray-200 bg-white px-5 transition-all z-50 duration-300
  ${openSidebar ? "w-[300px] min-w-[300px] translate-x-0" : "w-[0px] -translate-x-full lg:w-[0px] opacity-50 lg:px-0"}
  lg:static lg:translate-x-0`}>

                <Aside openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden ">
                <TopBar openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />

                <div className="p-4 md:p-5 overflow-y-auto h-[calc(100%-76px)] overflow-x-auto bg-gray-100">
                    {children}
                </div>
            </div>
        </>
    );
}
