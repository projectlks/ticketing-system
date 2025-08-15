"use client";

import SelectBox from "@/components/SelectBox";
import React, { useState } from "react";
import Swal from "sweetalert2";
import ViewContext from "@/components/ViewContext";
import { ticketStatusUpdate } from "../../action";

enum Status {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    CLOSED = "CLOSED",
}

interface Props {
    ticket: {
        id: string;
        status: Status;
    };
}

export default function StatusBox({ ticket }: Props) {
    const [ticketData, setTicketData] = useState(ticket);

    const statusOptions = Object.values(Status).map((status) => ({
        id: status,
        name: status.replace(/_/g, " "),
    }));

    const handleStatusChange = async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!(e.target instanceof HTMLSelectElement)) return;

        const selectedStatus = e.target.value as Status;
        if (!selectedStatus || selectedStatus === ticketData.status) return;

        const result = await Swal.fire({
            title: "Confirm status change",
            text: `Are you sure you want to change status to "${selectedStatus.replace(/_/g, " ")}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, change",
            cancelButtonText: "Cancel",
        });

        if (result.isConfirmed) {
            setTicketData((prev) => ({
                ...prev,
                status: selectedStatus,
            }));

            await ticketStatusUpdate(ticket.id, selectedStatus);

            Swal.fire({
                icon: "success",
                title: "Status Updated!",
                text: `Ticket status changed to "${selectedStatus.replace(/_/g, " ")}".`,
                timer: 1500,
                showConfirmButton: false,
            });
        }
    };

    return (
        <>
            <ViewContext
                label="Status"
                value={ticketData.status.replace(/_/g, " ")}
            />

            <SelectBox
                label="Change Status"
                id="statusSelect"
                name="statusSelect"
                value={ticketData.status}
                options={statusOptions}
                onChange={handleStatusChange}
                placeholder="Select status"
            />
        </>
    );
}
