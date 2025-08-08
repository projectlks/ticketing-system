"use client";

import { useEffect, useRef, useState } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

interface DotMenuProps {
    isBottom?: boolean;
    option: {
        view?: boolean;
        edit?: boolean;
        delete?: boolean;
    };

    onDelete?: () => void;
    onEdit?: () => void;
    onView?: () => void;
}

export default function DotMenu({ isBottom, option, onDelete, onEdit, onView }: DotMenuProps) {
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }

        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMenu]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full cursor-pointer hover:bg-gray-100 flex justify-center items-center"
            >
                <EllipsisVerticalIcon className="w-6 h-6" />
            </button>

            {showMenu && (
                <div className={`absolute min-w-[100px] z-50 right-0 text-xs bg-white border border-gray-300 rounded p-1 flex flex-col space-y-1
                    ${isBottom ? '-top-[150%]' : 'top-full '}`}>
                    
                    {option?.view && (
                        <button onClick={onView} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            View
                        </button>
                    )}

                    {option?.edit && (
                        <button onClick={onEdit} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            Edit
                        </button>
                    )}

                    {option?.delete && (
                        <button onClick={onDelete} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
