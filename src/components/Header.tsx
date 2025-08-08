import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import React, {  } from 'react'

interface HeaderProps {
    title?: string
    buttonLabel?: string
    placeholder?: string
    click: () => void
    setSearchQuery : ((query: string) => void) 
    searchQuery: string
}

export default function Header({
    title = 'Accounts',
    buttonLabel = 'New',
    placeholder = 'Search by Name',
    click,
     setSearchQuery, 
        searchQuery = ''

}: HeaderProps) {

    return (
        <div className="px-5 py-4 sm:px-6 sm:py-5 flex border-b border-gray-200 justify-between items-center">
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => click()}
                    type="button"
                    className="rounded h-[33px] text-sm px-2.5 text-gray-100 cursor-pointer bg-indigo-500 hover:bg-indigo-600 shadow-md flex items-center space-x-1"
                >
                    <p>{buttonLabel}</p>
                </button>
                <h1 className="text-sm text-gray-800">{title}</h1>
            </div>

            {/* search box */}
            <div className="relative">
                <input
                    type="text"
                    id="category-input"
                    placeholder={placeholder}
                    className="h-[34px] w-[350px] sm:w-[400px] md:w-[450px] rounded border border-gray-300 bg-transparent px-9 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value) }}
                />
                {/* search icon */}
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 pointer-events-none text-gray-700 w-4 h-4">
                    <MagnifyingGlassIcon />
                </div>
            </div>
            {/* </form> */}

            <div></div>
        </div>
    )
}
