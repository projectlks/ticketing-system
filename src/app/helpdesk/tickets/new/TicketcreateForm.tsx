"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useRouter, useSearchParams } from "next/navigation";

import Header from "@/components/ticket/Header";
import TitleInput from "@/components/ticket/TitleInput";
import PrioritySection from "@/components/ticket/PrioritySection";
import AssignmentSection from "@/components/ticket/AssignmentSection";
import RemarkInput from "@/components/ticket/RemarkInput";
import DescriptionInput from "@/components/ticket/DescriptionInput";
import SubmitSection from "@/components/ticket/SubmitSection";
import AuditPanel from "@/components/ticket/AuditPanel";
import ImageInput from "../ImageInput";

import { createTicket, updateTicket, getTicketAuditLogs } from "../action";

import { Audit, Status } from "@/generated/prisma/client";
import { CommentWithRelations } from "@/components/CommentSection";

/* =====================
   Zod Schema
===================== */
const TicketSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  departmentId: z.string().min(1),
  categoryId: z.string().min(1),
  priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]),
  ticketId: z.string().optional(),
  resolutionDue: z.date().optional(),
  status: z
    .enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"])
    .optional(),
  assignedToId: z.string().optional(),
});

export type FormType = z.infer<typeof TicketSchema>;

/* =====================
   Props
===================== */
type TicketFormProps = {
  mode: "create" | "edit";
  ticket?: {
    id: string;
    ticketId: string;
    title: string;
    description: string;
    departmentId: string | null;
    categoryId: string | null;
    priority: FormType["priority"] | null;
    images?: { id: string; url: string }[];
    resolutionDue?: Date;
    status: Status;
    assignedToId: string | null;
  } | null;
  cats: { id: string; name: string; departmentId: string }[];
  depts: { id: string; name: string }[];
  users: { id: string; name: string; email: string; departmentId: string }[];
  auditLog?: Audit[];
  commets?: CommentWithRelations[];
};

/* =====================
   Component
===================== */
export default function TicketcreateForm({
  mode,
  ticket,
  depts,
  cats,
  users,
  auditLog = [],
}: TicketFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* =====================
     Form State
  ===================== */
  const [form, setForm] = useState<FormType>({
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

  const [errors, setErrors] = useState<Partial<Record<keyof FormType, string>>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  /* =====================
     Priority / Remark
  ===================== */
  const originalPriority = ticket?.priority ?? "REQUEST";

  const priorityChanged = mode === "edit" && form.priority !== originalPriority;

  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");

  /* Reset remark whenever priority changes */
  useEffect(() => {
    if (priorityChanged) {
      setRemark("");
      setRemarkError("");
    }
  }, [form.priority]);

  /* =====================
     Images
  ===================== */
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState(ticket?.images ?? []);

  /* =====================
     Audit
  ===================== */
  const [auditLogs, setAuditLogs] = useState<Audit[]>(auditLog);

  /* =====================
     Default filter
  ===================== */
  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter) {
      setForm((p) => ({ ...p, departmentId: filter }));
    }
  }, []);

  /* =====================
     Helpers
  ===================== */
  const uploadImages = async (files: File[]) => {
    if (!files.length) return [];
    const fd = new FormData();
    files.forEach((f) => fd.append("file", f));
    const res = await fetch("/api/uploads", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    return data.urls as string[];
  };

  /* =====================
     Submit
  ===================== */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setRemarkError("");

    const parsed = TicketSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormType, string>> = {};
      parsed.error.issues.forEach((err) => {
        const key = err.path[0] as keyof FormType;
        errs[key] = err.message;
      });
      setErrors(errs);
      return;
    }

    if (priorityChanged && !remark.trim()) {
      setRemarkError("Remark is required when changing priority");
      return;
    }

    setSubmitting(true);

    try {
      const uploaded = await uploadImages(images);
      const fd = new FormData();

      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));

      if (mode === "create") {
        fd.append("images", JSON.stringify(uploaded));
        const { id } = await createTicket(fd);
        toast.success("Ticket created");
        router.push(`/helpdesk/tickets/${id}`);
      } else {
        if (!ticket?.id) throw new Error("Missing ID");

        fd.append("id", ticket.id);
        fd.append("remark", remark);
        fd.append("newImages", JSON.stringify(uploaded));
        fd.append(
          "existingImageIds",
          JSON.stringify(existingImages.map((i) => i.id)),
        );

        await updateTicket(ticket.id, fd);
        setAuditLogs(await getTicketAuditLogs(ticket.id));
        toast.success("Ticket updated");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================
     Render
  ===================== */
  return (
    <>
      <ToastContainer />

      <section className="flex gap-5 bg-gray-100  p-5">
        <form
          onSubmit={handleSubmit}
          className="w-2/3 bg-white sticky h-fit top-5 z-10 shadow-md p-8">
          <Header
            ticketId={form.ticketId ?? "NEW"}
            mode={mode}
            resolutionDue={ticket?.resolutionDue}
            status={form.status!}
            onStatusChange={(s) => setForm((p) => ({ ...p, status: s }))}
          />

          <TitleInput
            value={form.title}
            error={errors.title}
            onChange={(v) => setForm((p) => ({ ...p, title: v }))}
          />

          <PrioritySection
            value={form.priority}
            mode={mode}
            onChange={(priority) => setForm((p) => ({ ...p, priority }))}
          />

          <AssignmentSection
            departmentId={form.departmentId}
            categoryId={form.categoryId}
            assignedToId={form.assignedToId ?? ""}
            depts={depts}
            cats={cats}
            users={users}
            errors={errors}
            onChange={(name, value) =>
              setForm((p) => ({
                ...p,
                [name]: value,
                ...(name === "departmentId"
                  ? {
                      categoryId: "",
                      assignedToId: "",
                    }
                  : {}),
              }))
            }
          />

          <RemarkInput
            value={remark}
            error={remarkError}
            visible={priorityChanged}
            onChange={setRemark}
          />

          <DescriptionInput
            value={form.description}
            error={errors.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
          />

          <ImageInput
            images={images}
            setImages={setImages}
            existingImages={existingImages}
            setExistingImages={setExistingImages}
          />

          <SubmitSection submitting={submitting} mode={mode} />
        </form>

        <AuditPanel logs={auditLogs} />
      </section>
    </>
  );
}
