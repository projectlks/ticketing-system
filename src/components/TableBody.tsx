import React from 'react'

export default function TableBody({ data, textAlign }: { data: string, textAlign?: 'left' | 'center' | 'right' }) {
    return (
        <td className={`px-5 py-4 sm:px-6 text-${textAlign || 'left'}`}>
            <p className="text-gray-500 truncate">{data}</p>
        </td>
    )
}
