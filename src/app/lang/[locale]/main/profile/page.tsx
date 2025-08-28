import React from 'react';
import ProfilePage from './Profile';
import { User, Department, JobPosition, Category, Ticket, Comment, CommentLike, Audit } from "@prisma/client";


export type DepartmentWithManager = Department & {
    manager?: User; // include manager details
};

export type JobPositionWithDept = JobPosition & {
    department: DepartmentWithManager;
};

export type UserFullData = User & {
    jobPosition?: JobPositionWithDept | null; // allow null
    createdDepartments?: Department[] | null;
    managedDepartments?: Department[] | null;
    updatedDepartments?: Department[] | null;
    createdCategories?: Category[] | null;
    updatedCategories?: Category[] | null;
    createdJobPositions?: JobPosition[] | null;
    requestTickets?: Ticket[] | null;
    assignedTickets?: Ticket[] | null;
    likes?: CommentLike[] | null;
    audits?: Audit[] | null;
    comments?: Comment[] | null;
};


export default async function Page() {

    return (
        <>

            <ProfilePage />
        </>
    );
}
