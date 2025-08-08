import React from 'react'


interface TableProps {

    data: string;
}

export default function Table({ data }: TableProps) {
    return (

        <th className="px-5 py-3 text-left sm:px-6">
            <p className="font-medium text-gray-500">{data}</p>
        </th>

    )
}
