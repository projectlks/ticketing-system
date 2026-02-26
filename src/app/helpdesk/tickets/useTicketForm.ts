// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "react-toastify";

// import { TicketSchema, TicketFormData } from "./ticket.schema";
// import { TicketData, TicketImage } from "./ticket.types";
// import { createTicket, updateTicket, getTicketAuditLogs } from "./action";
// import { Audit } from "@/generated/prisma/client";
// import { getSocket } from "@/libs/socket-client";

// type UseTicketFormArgs = {
//     mode: "create" | "edit";
//     ticket?: TicketData | null;
//     auditLog?: Audit[];
// };

// type FormErrors = Partial<Record<keyof TicketFormData, string>>;

// export function useTicketForm({
//     mode,
//     ticket,
//     auditLog = [],
// }: UseTicketFormArgs) {
//     const router = useRouter();
//     const searchParams = useSearchParams();

//     /* ---------------- State ---------------- */
//     const [form, setForm] = useState<TicketFormData>({
//         title: ticket?.title ?? "",
//         description: ticket?.description ?? "",
//         departmentId: ticket?.departmentId ?? "",
//         categoryId: ticket?.categoryId ?? "",
//         priority: ticket?.priority ?? "REQUEST",
//         ticketId: ticket?.ticketId ?? "NEW",
//         resolutionDue: ticket?.resolutionDue,
//         status: ticket?.status ?? "NEW",
//         assignedToId: ticket?.assignedToId ?? "",
//     });

//     const [images, setImages] = useState<File[]>([]);
//     const [existingImages, setExistingImages] = useState<TicketImage[]>(
//         ticket?.images ?? [],
//     );

//     const [errors, setErrors] = useState<FormErrors>({});
//     const [submitting, setSubmitting] = useState(false);
//     const [remark, setRemark] = useState("");
//     const [remarkError, setRemarkError] = useState("");
//     const [auditLogs, setAuditLogs] = useState<Audit[]>(auditLog);

//     /* ---------------- Derived ---------------- */
//     const originalPriority = ticket?.priority ?? "REQUEST";
//     const priorityChanged = mode === "edit" && form.priority !== originalPriority;

//     /* ---------------- Effects ---------------- */
//     // Apply filter from search params
//     useEffect(() => {
//         const filter = searchParams.get("filter");
//         if (filter) {
//             setForm((prev) => ({ ...prev, departmentId: filter }));
//         }
//     }, [searchParams]);

//     // Reset remark when priority changes
//     useEffect(() => {
//         if (priorityChanged) {
//             setRemark("");
//             setRemarkError("");
//         }
//     }, [priorityChanged]);

//     /* ---------------- Submit ---------------- */
//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {



//         e.preventDefault();
//         setErrors({});
//         setRemarkError("");



//         const parsed = TicketSchema.safeParse(form);
//         if (!parsed.success) {

//             const nextErrors: FormErrors = {};
//             parsed.error.issues.forEach((issue) => {
//                 const key = issue.path[0] as keyof TicketFormData;
//                 nextErrors[key] = issue.message;
//             });
//             setErrors(nextErrors);
//             toast.error("Please fix the errors in the form");
//             return;
//         }

//         if (priorityChanged && !remark.trim()) {
//             setRemarkError("Remark is required when changing priority");
//             return;
//         }

//         try {
//             setSubmitting(true);

//             const fd = new FormData();
//             Object.entries(form).forEach(([key, value]) => {
//                 fd.append(key, String(value ?? ""));
//             });

//             if (mode === "create") {
//                 const { id } = await createTicket(fd);
//                 toast.success("Ticket created");
//                 router.push(`/helpdesk/tickets/${id}`);
//             } else if (ticket?.id) {
//                 fd.append("id", ticket.id);
//                 fd.append("remark", remark);

//                 await updateTicket(ticket.id, fd);

//                 // Emit latest audit to server
//                 const audits = await getTicketAuditLogs(ticket.id);
//                 const socket = getSocket();
//                 socket.emit("update-ticket", {
//                     id: ticket.id,
//                     audit: audits[0], // send latest audit
//                     ticket: form, // send updated ticket data
//                 });

//             }
//         } catch (error) {
//             toast.error((error as Error).message);
//         } finally {
//             setSubmitting(false);


//         }
//     };



//     useEffect(() => {


//         const socket = getSocket();
//         socket.emit("join-ticket", ticket?.id);

//         socket.on("ticket-updated", (audit: Audit, updatedTicket: TicketFormData) => {
//             if (audit.entityId !== ticket?.id) return;

//             setAuditLogs((prev) => [audit, ...prev]);
//             setForm(prev => ({ ...prev, ...updatedTicket }));

//             toast.success("Ticket updated");
//         });

//         return () => {
//             socket.off("ticket-updated");
//         };
//     }, [ticket?.id]);





//     return {
//         ticketId: ticket?.id,
//         form,
//         setForm,
//         errors,
//         submitting,
//         remark,
//         setRemark,
//         remarkError,
//         priorityChanged,
//         auditLogs,
//         images,
//         setImages,
//         existingImages,
//         setExistingImages,
//         handleSubmit,
//     };
// }


"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { TicketSchema, TicketFormData } from "./ticket.schema";
import { TicketData, TicketImage } from "./ticket.types";
import { createTicket, updateTicket, getTicketAuditLogs } from "./action";
import { Audit } from "@/generated/prisma/client";
import { getSocket } from "@/libs/socket-client";

type UseTicketFormArgs = {
    mode: "create" | "edit";
    ticket?: TicketData | null;
    auditLog?: Audit[];
};

type FormErrors = Partial<Record<keyof TicketFormData, string>>;

export function useTicketForm({
    mode,
    ticket,
    auditLog = [],
}: UseTicketFormArgs) {
    const router = useRouter();
    const searchParams = useSearchParams();

    /* ---------------- State ---------------- */
    const [form, setForm] = useState<TicketFormData>({
        title: ticket?.title ?? "",
        description: ticket?.description ?? "",
        departmentId: ticket?.departmentId ?? "",
        categoryId: ticket?.categoryId ?? "",
        priority: ticket?.priority ?? "REQUEST",
        ticketId: ticket?.ticketId ?? "NEW",
        resolutionDue: ticket?.resolutionDue,
        status: ticket?.status ?? "NEW",
        assignedToId: ticket?.assignedToId ?? "",
    });

    const [images, setImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<TicketImage[]>(
        ticket?.images ?? []
    );

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [remark, setRemark] = useState("");
    const [remarkError, setRemarkError] = useState("");
    const [auditLogs, setAuditLogs] = useState<Audit[]>(auditLog);

    /* ---------------- Derived ---------------- */
    const originalPriority = ticket?.priority ?? "REQUEST";
    const priorityChanged = mode === "edit" && form.priority !== originalPriority;

    /* ---------------- Effects ---------------- */
    // URL search params ထဲက `filter` (department) ကို form ထဲ apply
    useEffect(() => {
        const filter = searchParams.get("filter");
        if (filter) {
            setForm((prev) => ({ ...prev, departmentId: filter }));
        }
    }, [searchParams]);

    // Priority ပြောင်းသွားရင် remark ကို reset (edit mode မှာသာ သက်ရောက်)
    useEffect(() => {
        if (priorityChanged) {
            setRemark("");
            setRemarkError("");
        }
    }, [priorityChanged]);

    // Realtime update (audit log / ticket data) ရဖို့ socket listener
    useEffect(() => {
        if (!ticket?.id) return;

        const socket = getSocket();
        socket.emit("join-ticket", ticket.id);

        const listener = (audit: Audit, updatedTicket: TicketFormData) => {
            if (audit.entityId !== ticket.id) return;

            setAuditLogs((prev) => [audit, ...prev]);


            setForm(prev => ({
                ...prev,
                // Server ကလာတဲ့ updated ticket data ကို local form ထဲ merge
                ...updatedTicket,
            }));




            toast.success("Ticket updated");
        };

        socket.on("ticket-updated", listener);

        return () => {
            socket.off("ticket-updated", listener);
        };
    }, [ticket?.id]);

    /* ---------------- Submit ---------------- */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrors({});
        setRemarkError("");

        // Form validation (resolutionDue ကို Date အဖြစ် normalize လုပ်ပြီး validate)
        // const PartialTicketSchema = TicketSchema.partial();
        // const parsed = PartialTicketSchema.safeParse(form);

        // const parsed = TicketSchema.safeParse(form);

        const parsed = TicketSchema.safeParse({
            ...form,
            resolutionDue: form.resolutionDue ? new Date(form.resolutionDue) : undefined,
        });
        if (!parsed.success) {
            const nextErrors: FormErrors = {};
            parsed.error.issues.forEach((issue) => {
                const key = issue.path[0] as keyof TicketFormData;
                nextErrors[key] = issue.message;
            });
            setErrors(nextErrors);
            toast.error("Please fix the errors in the form");
            return;
        }

        // Priority ပြောင်းထားရင် remark မဖြစ်မနေရ ထည့်ခိုင်း (audit အတွက်)
        if (priorityChanged && !remark.trim()) {
            setRemarkError("Remark is required when changing priority");
            toast.error("Please add a remark for priority change");
            return;
        }

        try {
            setSubmitting(true);

            const fd = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                fd.append(key, String(value ?? ""));
            });

            // Include remark only for edit
            if (mode === "edit" && ticket?.id) {
                fd.append("id", ticket.id);
                fd.append("remark", remark);
            }

            // Send request
            if (mode === "create") {
                const { id } = await createTicket(fd);
                toast.success("Ticket created successfully");
                router.push(`/helpdesk/tickets/${id}`);
            } else if (ticket?.id) {
                await updateTicket(ticket.id, fd);


                const audits = await getTicketAuditLogs(ticket.id);
                const socket = getSocket();






                // တခြား client တွေကို audit + updated ticket info ကို realtime ပြန်ပို့
                socket.emit("update-ticket", {
                    id: ticket.id,
                    audit: audits[0], // latest audit
                    ticket: form, // current form data
                });

                toast.success("Ticket updated successfully");
            }
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        ticketId: ticket?.id,
        form,
        setForm,
        errors,
        submitting,
        remark,
        setRemark,
        remarkError,
        priorityChanged,
        auditLogs,
        images,
        setImages,
        existingImages,
        setExistingImages,
        handleSubmit,
    };
}
