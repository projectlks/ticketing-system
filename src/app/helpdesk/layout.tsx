import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import UserProfile from '@/components/UserProfile'

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full h-screen  bg-[#f5f5f5] ">



      <div className="flex items-center border-b border-gray-300 bg-white px-3 space-x-3 py-3 ">

        <span className="block h-[30px] aspect-square  rounded-full">

          <Image src="/download.png" alt="Helpdesk" width={30} height={30} />


        </span>
        <Link href={"/helpdesk"}>

          <h3>
            Helpdesk
          </h3>

        </Link>
        <ul className="flex items-center space-x-1 text-xs ">
          <Link href={"/helpdesk"}>

            <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">Overview</li>
          </Link>

          <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer relative group">

            <p>Tickets</p>

            {/* Dropdown */}
            <span className="absolute text-[10px] top-[calc(100%+5px)] left-0 p-1 border border-gray-300 w-[100px] flex flex-col rounded bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">

              <Link href={"/helpdesk/tickets?&filter=My%20Tickets"}>
                <p className="hover:bg-gray-100 px-2 py-1 rounded">My Tickets</p>
              </Link>
              <Link href={"/helpdesk/tickets"}>
                <p className="hover:bg-gray-100 px-2 py-1 rounded">All Tickets</p>
              </Link>
            </span>

          </li>
          <Link href={"/helpdesk/alerts"}>
            <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">Alerts</li>
          </Link>
          <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer">Reporting</li>
          <li className="hover:bg-gray-300 px-2 py-1 rounded cursor-pointer relative group">

            <p>Configuration</p>

            {/* Dropdown */}
            <span className="absolute text-[10px] z-50 top-[calc(100%+5px)] left-0 p-1 border border-gray-300 w-[100px] flex flex-col rounded bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link href={"/helpdesk/department"}>
                <p className="hover:bg-gray-100 px-2 py-1 rounded">Departments</p>
              </Link>
              <Link href={"/helpdesk/category"}>
                <p className="hover:bg-gray-100 px-2 py-1 rounded">Categories</p>
              </Link>
              <Link href={"/helpdesk/user"}>
                <p className="hover:bg-gray-100 px-2 py-1 rounded">User</p>
              </Link>
            </span>

          </li>
          <li>

          </li>
        </ul>


        <div className='flex-1 pr-5'>
          <UserProfile />
        </div>

      </div>
      {children}

    </section>
  )
}
