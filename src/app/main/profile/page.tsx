import React from 'react';
import ProfilePage from './Profile';
import { getCurrentUserData } from './action';
import { User } from '@prisma/client';

export default async function page() {
    const { data }: { data: User } = await getCurrentUserData();

    return (
        <>
            <ProfilePage data={data} />
        </>
    );
}
