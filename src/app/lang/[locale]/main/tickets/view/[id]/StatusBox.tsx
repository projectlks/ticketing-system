"use client";

import SelectBox from "@/components/SelectBox";
import React, { useState } from "react";
import Swal from "sweetalert2";
import ViewContext from "@/components/ViewContext";
import { ticketStatusUpdate } from "../../action";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export enum Status {
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
    const t = useTranslations("viewContext");

    // All status options with translated names
    const statusOptions = Object.values(Status).map((status) => ({
        id: status,
        name: t(status.toLowerCase()), // "open", "in_progress", etc.
    }));

    // Role-based allowed transitions
    const getAllowedOptions = (): { id: string; name: string }[] => {
        const role = data?.user.role;
        const current = ticketData.status;

        let allowed: Status[] = [];

        if (role === "AGENT") {
            allowed = [current];
            if (current === Status.IN_PROGRESS) allowed.push(Status.RESOLVED);
        } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
            allowed = [current];
            if (current === Status.IN_PROGRESS) allowed.push(Status.RESOLVED, Status.CLOSED);
        } else {
            allowed = [current];
        }

        return statusOptions.filter((s) => allowed.includes(s.id as Status));
    };

    const allowedOptions = getAllowedOptions();

    const handleStatusChange = async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!(e.target instanceof HTMLSelectElement)) return;

        const selectedStatus = e.target.value as Status;
        if (!selectedStatus || selectedStatus === ticketData.status) return;

        const result = await Swal.fire({
            title: t("confirmStatusChange"),
            text: t("changeStatusText", { status: t(selectedStatus.toLowerCase()) }),
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: t("yesChange"),
            cancelButtonText: t("cancel"),
        });

        if (result.isConfirmed) {
            setTicketData((prev) => ({
                ...prev,
                status: selectedStatus,
            }));

            await ticketStatusUpdate(ticket.id, selectedStatus);

            Swal.fire({
                icon: "success",
                title: t("statusUpdated"),
                text: t("statusChangedTo", { status: t(selectedStatus.toLowerCase()) }),
                timer: 1500,
                showConfirmButton: false,
            });
        }
    };

    return (
        <>
            <ViewContext label={t("status")} value={ticketData.status} />

            {allowedOptions.length > 1 && (
                <SelectBox
                    label={t("changeStatus")}
                    id="statusSelect"
                    name="statusSelect"
                    value={ticketData.status}
                    options={allowedOptions}
                    onChange={handleStatusChange}
                    placeholder={t("selectStatus")}
                />
            )}
        </>
    );
}
