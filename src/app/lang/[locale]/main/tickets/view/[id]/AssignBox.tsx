"use client";

import SelectBox from '@/components/SelectBox';
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import ViewContext from '@/components/ViewContext';
import { ticketAssign } from '../../action';
import { useSession } from 'next-auth/react';

interface Props {
    users: {
        id: string;
        email: string;
        name: string;
    }[];
    ticket: {
        id: string
        assignedToId: string
        assignedTo: {
            id: string;
            name: string;
            email: string;
        } | null;
    };

}


export default function AssignBox({ users, ticket }: Props) {
    const [ticketData, setTicketData] = useState(ticket);
    const handleAssignChange = async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!(e.target instanceof HTMLSelectElement)) return;

        const selectedUserId = e.target.value;
        const selectedUser = users.find(u => u.id === selectedUserId) || null;

        if (!selectedUser) return;

        const result = await Swal.fire({
            title: 'Confirm assignment',
            text: `Are you sure you want to assign to " ${selectedUser.name} " ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, assign',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {





            setTicketData(prev => ({
                ...prev,
                assignedToId: selectedUser.id,
                assignedTo: selectedUser,
            }));

            await ticketAssign(ticket.id, selectedUser.id);


            Swal.fire({
                icon: 'success',
                title: 'Assigned!',
                text: `  " ${selectedUser.name} " has been assigned.`,
                timer: 1500,
                showConfirmButton: false,
            });
        }
    };

    const { data } = useSession()
    const show = (!ticketData.assignedTo?.id) && (data?.user.role === "ADMIN" || data?.user.role === "SUPER_ADMIN")
    return (
        <>
            <ViewContext
                label="Assigned To"
                value={ticketData.assignedTo?.name || "-"}
            />

            {
                show && (
                    <>

                        <SelectBox
                            label="Assigned User"
                            id="assignUser"
                            name="assignUser"
                            value={ticketData.assignedTo?.id || ""}
                            options={users}
                            showEmail
                            onChange={handleAssignChange}
                            placeholder="Select user"
                        />
                    </>
                )
            }

        </>
    );
}
