"use client";

import { useEffect, useRef, useState } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface DotMenuProps {
    isBottom?: boolean;
    option: {
        view?: boolean;
        edit?: boolean;
        delete?: boolean;
        restore?: boolean;
    };
    onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onView?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onRestore?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function DotMenu({ isBottom, option, onDelete, onEdit, onView, onRestore }: DotMenuProps) {
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
    const t = useTranslations('dotMenu'); // 🎯 single instance

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation(); // 🚫 prevent parent click

                    setShowMenu(!showMenu)
                }}
                className="w-8 h-8 rounded-full cursor-pointer hover:bg-gray-100 flex justify-center items-center"
            >
                <EllipsisVerticalIcon className="w-6 h-6" />
            </button>

            {showMenu && (
                <div className={`absolute min-w-[100px] z-50 right-0 text-xs bg-white border border-gray-300 rounded p-1 flex flex-col space-y-1
                    ${isBottom ? '-top-[150%]' : 'top-full '}`}>

                    {option?.view && (
                        <button onClick={onView} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            {t('view')}
                        </button>
                    )}

                    {option?.edit && (
                        <button onClick={onEdit} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            {t('edit')}
                        </button>
                    )}

                    {option?.delete && (
                        <button onClick={onDelete} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            {t('delete')}
                        </button>
                    )}
                    {option?.restore && (
                        <button onClick={onRestore} className="w-full cursor-pointer px-3 py-1 text-left hover:bg-gray-100">
                            {t('restore')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
