"use client";

import SelectBox from "@/components/SelectBox";
import React, { useState } from "react";
import Swal from "sweetalert2";
import ViewContext from "@/components/ViewContext";
import { ticketStatusUpdate } from "../../action";
import { useSession } from "next-auth/react";

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
    const { data } = useSession();

    // All status options (for display names)
    const statusOptions = Object.values(Status).map((status) => ({
        id: status,
        name: status.replace(/_/g, " "),
    }));

    // Role-based allowed transitions, include current status
    const getAllowedOptions = (): { id: string; name: string }[] => {
        const role = data?.user.role;
        const current = ticketData.status;

        let allowed: Status[] = [];

        if (role === "AGENT") {
            // Agent: current + RESOLVED if IN_PROGRESS
            allowed = [current];
            allowed.push(Status.RESOLVED);
        } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
            // Admin/Super Admin: current + RESOLVED + CLOSED if IN_PROGRESS
            allowed = [current];
            allowed.push(Status.RESOLVED, Status.CLOSED);
        } else {
            // Requester: only current
            allowed = [current];
        }

        return statusOptions.filter((s) => allowed.includes(s.id as Status));
    };
    //  if (current === Status.IN_PROGRESS ) 
    const allowedOptions = getAllowedOptions();

    const handleStatusChange = async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!(e.target instanceof HTMLSelectElement)) return;

        const selectedStatus = e.target.value as Status;
        if (!selectedStatus || selectedStatus === ticketData.status) return;

        const result = await Swal.fire({
            title: "Confirm status change",
            text: `Are you sure you want to change status to "${selectedStatus.replace(
                /_/g,
                " "
            )}"?`,
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
            {/* Everyone can see current status */}
            <ViewContext
                label="Status"
                value={ticketData.status.replace(/_/g, " ")}
            />

            {/* Only show select box if allowed options > 1 (meaning user can change) */}
            {allowedOptions.length > 1 && (
                <SelectBox
                    label="Change Status"
                    id="statusSelect"
                    name="statusSelect"
                    value={ticketData.status} // current status as default
                    options={allowedOptions}
                    onChange={handleStatusChange}
                    placeholder="Select status"
                />
            )}
        </>
    );
}
