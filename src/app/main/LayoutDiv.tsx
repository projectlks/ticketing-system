"use client";
import Aside from "@/components/Aside";
import TopBar from "@/components/TopBar";
import React, { useState } from "react";

export default function LayoutDiv({ children }: { children: React.ReactNode }) {
    const [openSidebar, setOpenSidebar] = useState<boolean>(false);

    return (
        <>
            <Aside openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />

            <div className="flex-1 flex flex-col ">
                <TopBar openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />

                <div className="p-4 md:p-5 overflow-y-auto h-[calc(100%-76px)] overflow-x-auto bg-gray-100">
                    {children}
                </div>
            </div>
        </>
    );
}
