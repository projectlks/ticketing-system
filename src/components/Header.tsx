import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import React, { ReactNode } from 'react'
import Button from './Button'

interface HeaderProps {
    title?: string
    buttonLabel?: string
    placeholder?: string
    click: () => void
    setSearchQuery: ((query: string) => void)
    searchQuery: string
    children ?: ReactNode
}

export default function Header({
    title = 'Accounts',
    buttonLabel = 'New',
    placeholder = 'Search by Name',
    click,
    setSearchQuery,
    searchQuery = '',

    children

}: HeaderProps) {

    return (
        <div className="px-5 py-4 sm:px-6 sm:py-5 flex border-b border-gray-200 justify-between items-center">
            <div className="flex items-center space-x-2">

                <Button click={click} buttonLabel={buttonLabel} />
                <h1 className="text-sm text-gray-800">{title}</h1>
            </div>

            {/* search box */}
            <div className="relative flex items-center space-x-2">
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

                {children}
            </div>
            {/* </form> */}

            <div></div>
        </div>
    )
}
