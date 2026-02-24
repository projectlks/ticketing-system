import { EnvelopeIcon } from '@heroicons/react/24/outline';
import React from 'react'
import Button from './Button';
import { DepartmentTicketStats } from '@/app/helpdesk/department/page';
import Link from 'next/link';




type DashboardCardProps = {
    dept: DepartmentTicketStats;
};

export default function DashboardCard({ dept }: DashboardCardProps) {

    const stats = [
        { label: "New", value: dept.count.new, query: "status=NEW" },
        { label: "Open", value: dept.count.open, query: "status=OPEN,IN_PROGRESS" },
        { label: "Unassigned", value: dept.count.unassigned, query: "ownership=Unassigned" },
        // Urgent ကို active critical tickets အဖြစ်ပြဖို့ priority + active statuses နှစ်ခုလုံး query ထည့်ထားပါတယ်။
        { label: "Urgent", value: dept.count.urgent, query: "priority=CRITICAL&status=NEW,OPEN,IN_PROGRESS" },
    ];


    return (
        <div key={dept.id} className="w-full h-full bg-white  border-gray-300 border   px-5 py-3  ">

            <h1 className="font-bold text-[18px] ">
                {/* EastWind Myanmar ( EWM ) */}
                {dept.name}
            </h1>
            <span className="flex items-end text-[14px] ml-1 text-indigo-500 space-x-1">

                <EnvelopeIcon className="w-4 h-4 " />
                <p>
                    {dept.email}
                </p>

            </span>


            <div className=" grid grid-cols-3 mt-5 ">

                <Link href={`/helpdesk/tickets/new?&filter=${dept.id}`}>
                    <Button buttonLabel="Tickets" />
                </Link>



                <Link href={`/helpdesk/tickets?departmentId=${dept.id}&status=CLOSED,RESOLVED,CANCELED`} className="flex col-span-2 text-xs text-indigo-500 justify-between items-center ">
                    <p>
                        Tickets Closed
                    </p>

                    <h1>
                        {dept.count.closed}
                    </h1>
                </Link>

            </div>


            {/* detail */}

            <div className="mt-8 grid grid-cols-4">
                {stats.map((item, idx) => (
                    <Link
                        key={idx}
                        href={`/helpdesk/tickets?departmentId=${dept.id}&${item.query}`}
                        className={`flex items-center flex-col ${idx === 1 ? "border-l border-gray-300" : ""
                            } ${idx === 2 ? "border-l border-r border-gray-300" : ""}`}
                    >
                        <h1 className="text-indigo-500 font-bold text-[12px]">
                            {item.value}
                        </h1>
                        <p className="text-xs text-gray-500">{item.label}</p>
                    </Link>
                ))}
            </div>

        </div>

    )
}
