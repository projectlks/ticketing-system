"use client";

import React from 'react';
import BackBtn from './BackBtn';
import { useTranslations } from 'next-intl';

interface ViewHeaderProps {
    name: 'users' | 'categories' | 'departments' | 'tickets';
}

export default function ViewHeader({ name }: ViewHeaderProps) {
    const tHeader = useTranslations('header');
    const tHistory = useTranslations('historyLog');

    return (
        <header className="mb-8 md:mb-10 flex items-center ">
            <BackBtn />
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {tHeader([name, 'title'].join('.'))}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {tHistory('description.common')}
                </p>
            </div>
        </header>
    );
}
