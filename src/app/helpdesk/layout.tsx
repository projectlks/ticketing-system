// import React from 'react'
// import Image from 'next/image'
// import Link from 'next/link'
// import UserProfile from '@/components/UserProfile'

// export default function layout({ children }: { children: React.ReactNode }) {
//   return (
//     <section className="w-full h-screen  bg-[#f5f5f5] ">



//       <div className="flex items-center border-b border-gray-300 bg-white px-3 space-x-3 py-3 ">

//         <span className="block h-[30px] aspect-square  rounded-full">

//           <Image src="/download.png" alt="Helpdesk" width={30} height={30} />


//         </span>
//         <Link href={"/helpdesk"}>

//           <h3>
//             Helpdesk
//           </h3>

//         </Link>
//         <ul className="flex items-center space-x-1 text-xs ">
//           <Link href={"/helpdesk"}>

//             <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">Overview</li>
//           </Link>

//           <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer relative group">

//             <p>Tickets</p>

//             {/* Dropdown */}
//             <span className="absolute text-[10px] top-[calc(100%+5px)] left-0 p-1 border border-gray-300 w-[100px] flex flex-col rounded bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">

//               <Link href={"/helpdesk/tickets?&filter=My%20Tickets"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">My Tickets</p>
//               </Link>
//               <Link href={"/helpdesk/tickets"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">All Tickets</p>
//               </Link>
//             </span>

//           </li>

//           <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer relative group">

//             <p>Alerts</p>

//             {/* Dropdown */}
//             <span className="absolute text-[10px] top-[calc(100%+5px)] left-0 p-1 border border-gray-300 w-[100px] flex flex-col rounded bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">

//               <Link href={"/helpdesk/alerts?&filter=My%20Tickets"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">current Alerts</p>
//               </Link>
//               <Link href={"/helpdesk/alerts"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">All Alerts</p>
//               </Link>
//             </span>

//           </li>

//           {/* <Link href={"/helpdesk/alerts"}>
//             <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">Alerts</li>
//           </Link> */}
//           <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">Reporting</li>
//           <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer relative group">

//             <p>Configuration</p>

//             {/* Dropdown */}
//             <span className="absolute text-[10px] z-50 top-[calc(100%+5px)] left-0 p-1 border border-gray-300 w-[100px] flex flex-col rounded bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
//               <Link href={"/helpdesk/department"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">Departments</p>
//               </Link>
//               <Link href={"/helpdesk/category"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">Categories</p>
//               </Link>
//               <Link href={"/helpdesk/user"}>
//                 <p className="hover:bg-gray-100 px-2 py-1 rounded">User</p>
//               </Link>
//             </span>

//           </li>
//           <li>

//           </li>
//         </ul>


//         <div className='flex-1 pr-5'>
//           <UserProfile />
//         </div>

//       </div>
//       {children}

//     </section>
//   )
// }

// app/helpdesk/layout.tsx

"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";

type DropdownItem = {
  label: string;
  href: { pathname: string; query?: Record<string, string> };
};

type MenuItem = {
  label: string;
  href?: { pathname: string; query?: Record<string, string> };
  dropdown?: DropdownItem[];
};

const menuItems: MenuItem[] = [
  { label: "Overview", href: { pathname: "/helpdesk" } },
  {
    label: "Tickets",
    dropdown: [
      { label: "My Tickets", href: { pathname: "/helpdesk/tickets", query: { filter: "My Tickets" } } },
      { label: "All Tickets", href: { pathname: "/helpdesk/tickets" } },
    ],
  },
  {
    label: "Alerts",
    dropdown: [
      { label: "Current Alerts", href: { pathname: "/helpdesk/alerts", query: { filter: "My Tickets" } } },
      { label: "All Alerts", href: { pathname: "/helpdesk/alerts" } },
    ],
  },
  { label: "Reporting", href: { pathname: "/helpdesk/reporting" } },
  {
    label: "Configuration",
    dropdown: [
      { label: "Departments", href: { pathname: "/helpdesk/department" } },
      { label: "Categories", href: { pathname: "/helpdesk/category" } },
      { label: "User", href: { pathname: "/helpdesk/user" } },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full h-screen bg-[#f5f5f5]">
      {/* Top Bar */}
      <div className="flex items-center border-b border-gray-300 bg-white px-3 py-3 space-x-3">
        {/* Logo */}
        <span className="block h-[30px] aspect-square rounded-full">
          <Image src="/download.png" alt="Helpdesk" width={30} height={30} />
        </span>

        <Link href={{ pathname: "/helpdesk" }}>
          <h3>Helpdesk</h3>
        </Link>

        {/* Menu */}
        <ul className="flex items-center space-x-1 text-xs">
          {menuItems.map((item) =>
            item.dropdown ? (
              <li key={item.label} className="relative group cursor-pointer px-2 py-1 rounded hover:bg-gray-300">
                <span>{item.label}</span>

                {/* Dropdown */}
                <div className="absolute left-0 top-[calc(100%+5px)] z-50 w-[140px] rounded border border-gray-300 bg-white p-1 text-[10px] opacity-0 invisible transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  {item.dropdown.map((drop) => (
                    <Link key={drop.href.pathname} href={drop.href}>
                      <p className="px-2 py-1 rounded hover:bg-gray-100">{drop.label}</p>
                    </Link>
                  ))}
                </div>
              </li>
            ) : (
              <li key={item.label} className="cursor-pointer px-2 py-1 rounded hover:bg-gray-300">
                <Link href={item.href!}>{item.label}</Link>
              </li>
            )
          )}
        </ul>

        {/* User Profile */}
        <div className="flex-1 pr-5">
          <UserProfile />
        </div>
      </div>

      {/* Page Content */}
      {children}
    </section>
  );
}
