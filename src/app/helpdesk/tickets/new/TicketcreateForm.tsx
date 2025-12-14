"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import Button from "@/components/Button";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createTicket, getTicketAuditLogs, updateTicket } from "../action";
import AuditLogList from "@/components/AuditLogList";
// import { Audit, Status } from "generated/prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import ImageInput from "../ImageInput";
import { PriorityStars } from "@/components/PriorityStars";
import Countdown from "@/components/Countdown";
import { Audit , Status} from "@/generated/prisma/client";

// =====================
// Zod Schema
// =====================
const TicketSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 letters"),
    description: z.string().min(5, "Description must be at least 5 letters"),
    departmentId: z.string().min(1, "Department is required"),
    categoryId: z.string().min(1, "Category is required"),
    priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]),
    ticketId: z.string().optional(),
    resolutionDue: z.date().optional(),
    status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]).optional(),
    remark: z.string().optional(),
    assignedToId: z.string().optional(),

});

// =====================
// Types
// =====================
export type FormType = z.infer<typeof TicketSchema>;

type TicketFormProps = {
    mode: "create" | "edit";
    ticket?: {
        id: string;
        ticketId: string;
        title: string;
        description: string;
        departmentId: string | null;
        categoryId: string | null;
        priority: "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL" | null;
        images?: { id: string; url: string }[];
        resolutionDue?: Date
        status: Status
        assignedToId: string | null

    } | null;
    cats: { id: string; name: string; departmentId: string }[];
    depts: { id: string; name: string }[];
    auditLog?: Audit[];
    users: {
        id: string, name: string, email: string, departmentId: string
    }[]

    defaultValue?: string
};

// =====================
// Component
// =====================
export default function TicketForm({ mode, ticket, depts, cats, auditLog = [], users = [] }: TicketFormProps) {
    const [form, setForm] = useState<FormType>({
        title: ticket?.title ?? "",
        description: ticket?.description ?? "",
        departmentId: ticket?.departmentId ?? "",
        categoryId: ticket?.categoryId ?? "",
        priority: (ticket?.priority as FormType["priority"]) ?? "REQUEST",
        ticketId: ticket?.ticketId ?? "NEW",
        resolutionDue: ticket?.resolutionDue ?? undefined,
        status: ticket?.status ?? "NEW", // ✅ initialize with ticket status or default
        assignedToId: ticket?.assignedToId ?? ""
    });

    const [errors, setErrors] = useState<Partial<Record<keyof FormType, string>>>({});
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(false);
    const [auditLogs, setAuditLogs] = useState<Audit[]>(auditLog);

    const [images, setImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>(ticket?.images ?? []);
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

    // single source of truth: form.priority
    const [remark, setRemark] = useState("");
    const [remarkError, setRemarkError] = useState("");

    // keep original priority to compare on submit (not reactive)
    const originalPriority: NonNullable<FormType["priority"]> = (ticket?.priority as NonNullable<FormType["priority"]>) ?? "REQUEST";

    const router = useRouter();

    // Filter categories based on selected department
    const filteredCategories = cats.filter((c) => c.departmentId === form.departmentId);
    const filteredUser = users.filter((u) => u.departmentId === form.departmentId);

    // Handle change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setForm((prev) => {
            if (name === "departmentId") {
                return {
                    ...prev,
                    departmentId: value,
                    categoryId: "",
                    assignedToId: "",

                };
            }
            return { ...prev, [name]: value } as FormType;
        });

        setErrors((prev) => ({ ...prev, [name]: "" }));
        setErrorMessage(false);
        setRemarkError("");
    };

    const uploadImages = async (files: FileList | File[]) => {
        if (!files || (Array.isArray(files) && files.length === 0)) return [];
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append("file", file));
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json();
        return data.urls as string[];
    };





    // Delete existing image
    async function deleteImage(url: string) {
        // const filename = url.split("/").pop();
        const filename = url.split("/").pop()?.split("?")[0]; // <-- remove ? params
        if (!filename) return;

        try {
            const res = await fetch(`/api/uploads/${filename}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");


        } catch (err: unknown) {
            let message = "Something went wrong";

            if (err instanceof Error) {
                message = err.message;
                toast.error(message)
            }

        }
    }


    // Handle submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // clear previous errors
        setErrors({});
        setErrorMessage(false);
        setRemarkError("");

        // Validate form schema first (so we don't upload images unnecessarily)
        const result = TicketSchema.safeParse(form);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof FormType, string>> = {};
            result.error.issues.forEach((err) => {
                const key = err.path[0] as keyof FormType;
                fieldErrors[key] = err.message;
            });
            setErrors(fieldErrors);
            setErrorMessage(true);
            return;
        }

        // Validate remark ONLY if priority changed (edit mode)
        if (mode === "edit") {
            if (form.priority !== originalPriority && remark.trim() === "") {
                setRemarkError("Remark is required when changing priority");
                return;
            }
        }

        setSubmitting(true);

        try {
            // Upload images after validation
            const imageUrls = await uploadImages(images);

            const fd = new FormData();
            // append form fields (cast to string)
            Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));

            if (mode === "create") {
                fd.append("images", JSON.stringify(imageUrls));
                const { id } = await createTicket(fd);
                toast.success("Ticket created successfully!");
                router.push(`/helpdesk/tickets/${id}`);
            } else {


                await Promise.all(
                    deletedImageIds.map(url => deleteImage(url))
                );







                if (!ticket?.id) throw new Error("Missing ticket ID");
                fd.append("newImages", JSON.stringify(imageUrls));
                fd.append("existingImageIds", JSON.stringify(existingImages.map((i) => i.id)));
                fd.append("id", ticket.id);
                // include remark in form data so backend can store audit log if needed
                fd.append("remark", remark);
                // fd.append("remark", );

                await updateTicket(ticket.id, fd);
                setAuditLogs(await getTicketAuditLogs(ticket.id));
                toast.success("Ticket updated successfully!");
            }
        } catch (err) {
            toast.error((err as Error).message);
            setErrorMessage(true);
        } finally {
            setSubmitting(false);
        }
    };

    const statuses: Status[] = ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"];



    const searchParams = useSearchParams();
    const defaultFilter = searchParams.get("filter");


    // Default filter on route load
    useEffect(() => {
        if (defaultFilter) {
            setForm(prev => {
                return ({ ...prev, departmentId: defaultFilter })
            })
        }
    }, [defaultFilter]);



    return (
        <>
            <ToastContainer />
            <section className="w-full space-x-10 flex p-5">
                <form
                    onSubmit={handleSubmit}
                    className={`shadow-md p-8 w-2/3  ${errorMessage ? "bg-red-100" : "bg-white"}`}
                >
                    <div className="flex items-center justify-between border-b pb-5 mb-10 border-gray-300">
                        <h1 className="font-bold text-2xl">{form.ticketId}</h1>


                        {mode === "edit" && ticket?.resolutionDue && (
                            <div className="flex items-center gap-2 ">
                                <span className="font-medium">Time Remaining :</span>
                                <Countdown targetTime={ticket.resolutionDue.toString()} />
                            </div>
                        )}



                        <div className="flex flex-wrap ">
                            {statuses.map((s) => {
                                const isActive = form.status === s;

                                return (
                                    <div
                                        key={s}
                                        onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                                        className={`
                    relative cursor-pointer px-8 py-1 text-sm font-medium  border-y border-l border-gray-300 
                    ${isActive ? "bg-blue-600 text-white" : "bg-gray-200  text-gray-700 "}
                                 
                `}
                                    >
                                        {s.replace("_", " ")}

                                        {/* Triangle */}
                                        <span
                                            className={`
                        absolute top-1/2 -translate-y-1/2
                     left-full
                        w-0 h-0
                        border-t-14 border-b-14 border-l-20
                        border-t-transparent border-b-transparent
                        ${isActive ? "border-l-blue-600" : "border-l-gray-200"}
                        z-9999                
                    `}
                                        />
                                    </div>
                                );
                            })}


                        </div>




                    </div>

                    {/* Title */}
                    <div className="mb-2">
                        <input
                            name="title"
                            type="text"
                            value={form.title}
                            onChange={handleChange}
                            className={`focus:border-b-2 w-[75%] py-2 text-xl focus:outline-none ${errors.title ? "border-red-500" : "focus:border-indigo-500"}`}
                            placeholder="Enter ticket title"
                        />
                        {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                    </div>

                    {/* Priority */}
                    <div className="mb-6  ">
                        <PriorityStars
                            value={form.priority}
                            onChange={(priority) => setForm((prev) => ({ ...prev, priority }))}
                            mode={mode}
                        />

                    </div>

                    {/* Remark (edit mode) */}


                    {/* Grid Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 mb-6 gap-8">
                        {/* Department */}
                        <div>
                            <label className="block font-medium mb-1">Department</label>
                            <select
                                name="departmentId"
                                value={form.departmentId}
                                onChange={handleChange}
                                className={`w-full px-1 py-2 appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right focus:outline-none ${errors.departmentId ? "border-b border-red-500" : ""}`}
                            >
                                <option value="">Select Department</option>
                                {depts.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            {errors.departmentId && <p className="text-red-500 text-sm">{errors.departmentId}</p>}
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block font-medium mb-1">Category</label>
                            <select
                                name="categoryId"
                                value={form.categoryId}
                                onChange={handleChange}
                                disabled={!form.departmentId}
                                className={`w-full px-1 py-2 appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right focus:outline-none ${errors.categoryId ? "border-b border-red-500" : ""}`}
                            >
                                <option value="">Select Category</option>



                                {filteredCategories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId}</p>}
                        </div>

                        {/* Assign To (placeholder - currently uses categoryId in your original code) */}
                        <div>
                            <label className="block font-medium mb-1">Assign To</label>
                            <select
                                name="assignedToId"
                                value={form.assignedToId}
                                onChange={handleChange}
                                disabled={!form.departmentId}
                                className={`w-full px-1 py-2 appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right focus:outline-none ${errors.categoryId ? "border-b border-red-500" : ""}`}
                            >
                                <option value="">Select Category</option>


                                {filteredUser.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.email}  )
                                    </option>
                                ))}
                            </select>
                            {errors.assignedToId && <p className="text-red-500 text-sm">{errors.assignedToId}</p>}
                        </div>
                    </div>


                    {/* Description */}


                    {(mode === "edit" && ticket?.priority !== form.priority) && (
                        <div className="mb-6">
                            <label className="block font-medium mb-1">Remark</label>
                            <textarea
                                name="description"
                                value={remark}
                                onChange={(e) => {
                                    setRemark(e.target.value);
                                    setRemarkError("");
                                }}
                                className={`w-full border-b py-2 focus:outline-none ${remarkError ? "bg-red-100 border-red-500 " : "border-gray-400 focus:border-indigo-500"}`}
                                placeholder="Add remark when changing priority"
                            />
                            {remarkError && <p className="text-red-500 text-sm mt-1">{remarkError}</p>}
                        </div>
                    )}
                    {/* Description





                    {/* Description */}
                    <div className="mb-6">
                        <label className="block font-medium mb-1">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            className={`w-full border-b py-2 focus:outline-none ${errors.description ? "border-red-500" : "border-gray-400 focus:border-indigo-500"}`}
                            placeholder="Describe the issue"
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                    </div>

                    <ImageInput images={images} setImages={setImages} existingImages={existingImages} setExistingImages={setExistingImages} setDeletedImageIds={setDeletedImageIds} />

                    {/* Submit */}
                    <div className="mt-6">
                        <Button
                            type="submit"
                            disabled={submitting}
                            buttonLabel={
                                submitting ? (mode === "create" ? "Creating..." : "Updating...") : (mode === "create" ? "Create" : "Update")
                            }
                        />
                    </div>
                </form>

                {/* Right Side: Audit Log */}
                <div className="border-l-4 w-1/3 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:shadow-md">
                    <div className="pb-4 px-6 pt-6">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <span>History Logs</span>
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground dark:text-gray-400">
                            Recent changes to this ticket
                        </p>
                    </div>
                    <div className="pt-2 px-6 pb-6">
                        <AuditLogList items={auditLogs} />
                    </div>
                </div>
            </section>
        </>
    );
}
