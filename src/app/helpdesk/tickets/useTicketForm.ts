"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { TicketSchema, TicketFormData } from "./ticket.schema";
import { TicketData, TicketImage } from "./ticket.types";
import { createTicket, getTicketAuditLogs, updateTicket } from "./action";
import { Audit } from "@/generated/prisma/client";
import { getSocket } from "@/libs/socket-client";

type UseTicketFormArgs = {
  mode: "create" | "edit";
  ticket?: TicketData | null;
  auditLog?: Audit[];
};

type FormErrors = Partial<Record<keyof TicketFormData, string>>;
type AssignmentFieldName = "departmentId" | "categoryId" | "assignedToId";

export function useTicketForm({ mode, ticket, auditLog = [] }: UseTicketFormArgs) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    ticket?.images ?? [],
  );
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");
  const [auditLogs, setAuditLogs] = useState<Audit[]>(auditLog);

  const originalPriority = ticket?.priority ?? "REQUEST";
  const priorityChanged = mode === "edit" && form.priority !== originalPriority;

  const toSchemaInput = (value: TicketFormData) => ({
    ...value,
    resolutionDue: value.resolutionDue ? new Date(value.resolutionDue) : undefined,
  });

  const handleFieldChange = <K extends keyof TicketFormData>(
    field: K,
    value: TicketFormData[K],
  ) => {
    setForm((previous) => {
      return {
        ...previous,
        [field]: value,
      } as TicketFormData;
    });

    setErrors((previous) => {
      const nextErrors = { ...previous };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleAssignmentChange = (name: string, value: string) => {
    if (
      name !== "departmentId" &&
      name !== "categoryId" &&
      name !== "assignedToId"
    ) {
      return;
    }

    let nextForm: TicketFormData | null = null;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      } as TicketFormData;

      if (name === "departmentId") {
        updated.categoryId = "";
        updated.assignedToId = "";
      }

      nextForm = updated;
      return updated;
    });

    if (!nextForm) return;

    setErrors((previous) => {
      const nextErrors = { ...previous };
      delete nextErrors[name as AssignmentFieldName];
      if (name === "departmentId") {
        delete nextErrors.categoryId;
      }
      return nextErrors;
    });
  };

  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter) {
      setForm((previous) => ({ ...previous, departmentId: filter }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (priorityChanged) {
      setRemark("");
      setRemarkError("");
    }
  }, [priorityChanged]);

  useEffect(() => {
    if (!ticket?.id) return;

    const socket = getSocket();
    socket.emit("join-ticket", ticket.id);

    const listener = (audit: Audit, updatedTicket: TicketFormData) => {
      if (audit.entityId !== ticket.id) return;

      setAuditLogs((previous) => [audit, ...previous]);
      setForm((previous) => ({
        ...previous,
        ...updatedTicket,
      }));

      toast.success("Ticket updated");
    };

    socket.on("ticket-updated", listener);

    return () => {
      socket.off("ticket-updated", listener);
    };
  }, [ticket?.id]);

  const uploadImages = async (files: File[]) => {
    if (!files.length) return [];

    const fd = new FormData();
    files.forEach((file) => fd.append("file", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: fd,
    });

    const payload = (await response.json()) as {
      success?: boolean;
      urls?: string[];
      message?: string;
    };

    if (!response.ok || !payload.success || !Array.isArray(payload.urls)) {
      throw new Error(payload.message ?? "Failed to upload images.");
    }

    return payload.urls;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setRemarkError("");

    const parsed = TicketSchema.safeParse(toSchemaInput(form));
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

    if (priorityChanged && !remark.trim()) {
      setRemarkError("Remark is required when changing priority");
      toast.error("Please add a remark for priority change");
      return;
    }

    try {
      const uploaded = await uploadImages(images);
      setSubmitting(true);

      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        const normalized = String(value ?? "").trim();
        if (key === "assignedToId" && !normalized) {
          return;
        }
        fd.append(key, String(value ?? ""));
      });

      if (mode === "edit" && ticket?.id) {
        fd.append("id", ticket.id);
        fd.append("remark", remark);
      }

      if (mode === "create") {
        fd.append("images", JSON.stringify(uploaded));
        const createResult = await createTicket(fd);
        if (createResult.error || !createResult.data) {
          toast.error(createResult.error ?? "Failed to create ticket");
          return;
        }

        toast.success("Ticket created successfully");
        router.push(`/helpdesk/tickets/${createResult.data.id}` as Route);
        return;
      }

      if (!ticket?.id) return;

      fd.append("newImages", JSON.stringify(uploaded));
      fd.append("existingImageIds", JSON.stringify(existingImages.map((image) => image.id)));
      if (deletedImageIds.length) {
        fd.append("deletedImageIds", JSON.stringify(deletedImageIds));
      }

      const updateResult = await updateTicket(ticket.id, fd);
      if (updateResult.error || !updateResult.data) {
        toast.error(updateResult.error ?? "Failed to update ticket");
        return;
      }

      const { urlsToDelete } = updateResult.data;
      await Promise.all(
        urlsToDelete.map((url) => fetch(url, { method: "DELETE" })),
      );

      const audits = await getTicketAuditLogs(ticket.id);
      const socket = getSocket();
      socket.emit("update-ticket", {
        id: ticket.id,
        audit: audits[0],
        ticket: form,
      });

      toast.success("Ticket updated successfully");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveExistingImage = (id: string) => {
    setDeletedImageIds((previous) =>
      previous.includes(id) ? previous : [...previous, id],
    );
  };

  return {
    ticketId: ticket?.id,
    form,
    setForm,
    handleFieldChange,
    handleAssignmentChange,
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
    deletedImageIds,
    handleRemoveExistingImage,
    handleSubmit,
  };
}

